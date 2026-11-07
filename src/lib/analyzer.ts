import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { DetectionRule, InstallerAnalysis } from '@/types';

export class InstallerAnalyzer {
  static readonly ENGINE_INNO = 'Inno Setup';
  static readonly ENGINE_NSIS = 'NSIS (Nullsoft)';
  static readonly ENGINE_WIX = 'WiX Toolset (Burn)';
  static readonly ENGINE_INSTALLSHIELD = 'InstallShield';
  static readonly ENGINE_ADVANCED_INSTALLER = 'Advanced Installer';
  static readonly ENGINE_SQUIRREL = 'Squirrel';
  static readonly ENGINE_MSI = 'Windows Installer (MSI)';
  static readonly ENGINE_GENERIC = 'Standard / Generic Executable';

  static analyze(filePath: string): InstallerAnalysis {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const filename = path.basename(filePath);

    if (ext === '.msi') {
      return this.analyzeMsi(filePath, filename, fileSize);
    } else if (ext === '.exe') {
      return this.analyzeExe(filePath, filename, fileSize);
    } else {
      return {
        filename,
        file_type: ext,
        size_bytes: fileSize,
        app_name: path.parse(filename).name,
        publisher: 'Unknown Publisher',
        version: '1.0.0.0',
        architecture: 'x64',
        engine: this.ENGINE_GENERIC,
        install_command: `"${filename}" /quiet /norestart`,
        uninstall_command: `"${filename}" /uninstall /quiet /norestart`,
        install_behavior: 'system',
        device_restart_behavior: 'suppress',
        suggested_detection_rules: this.generateFallbackRules(filename, '1.0.0.0'),
        notes: `Generic handling for file extension '${ext}'`,
      };
    }
  }

  private static analyzeMsi(filePath: string, filename: string, fileSize: number): InstallerAnalysis {
    let productCode = '';
    let productName = '';
    let productVersion = '';
    let manufacturer = '';
    let upgradeCode = '';

    // If on Windows, query WindowsInstaller.Installer COM object
    if (process.platform === 'win32') {
      try {
        const psCmd =
          `$installer = New-Object -ComObject WindowsInstaller.Installer; ` +
          `$db = $installer.OpenDatabase('${filePath}', 0); ` +
          `$view = $db.OpenView('SELECT Property, Value FROM Property'); ` +
          `$view.Execute(); ` +
          `$res = @{}; ` +
          `while ($record = $view.Fetch()) { $res[$record.StringData(1)] = $record.StringData(2) }; ` +
          `$res | ConvertTo-Json -Compress`;
        const res = execSync(`powershell.exe -NoProfile -NonInteractive -Command "${psCmd}"`, {
          encoding: 'utf-8',
          timeout: 8000,
        }).trim();
        if (res) {
          const props = JSON.parse(res);
          productCode = props.ProductCode || '';
          productName = props.ProductName || '';
          productVersion = props.ProductVersion || '';
          manufacturer = props.Manufacturer || '';
          upgradeCode = props.UpgradeCode || '';
        }
      } catch (e) {
        // Fallback to binary pattern scanning
      }
    }

    // Binary scanning fallback
    if (!productCode || !productName) {
      try {
        const buf = fs.readFileSync(filePath);
        const text = buf.toString('latin1');
        const guidRegex = /\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}/g;
        const matches = text.match(guidRegex);
        if (matches && matches.length > 0) {
          productCode = matches[0];
        }
      } catch (e) {
        // ignore
      }
    }

    const appName = productName || path.parse(filename).name;
    const publisher = manufacturer || 'Enterprise Software';
    const version = productVersion || '1.0.0';

    const suggestedRules: DetectionRule[] = [];
    if (productCode) {
      suggestedRules.push({
        type: 'msi',
        productCode,
        productVersion: version,
        productVersionOperator: 'greaterThanOrEqual',
        checkProductVersion: false,
        description: `MSI ProductCode Detection (${productCode})`,
      });
    } else {
      suggestedRules.push({
        type: 'file',
        path: `%ProgramFiles%\\${appName}`,
        fileOrFolderName: `${appName}.exe`,
        detectionType: 'exists',
        operator: 'greaterThanOrEqual',
        check32BitOn64System: false,
        description: `File existence in Program Files`,
      });
    }

    return {
      filename,
      file_type: '.msi',
      size_bytes: fileSize,
      app_name: appName,
      publisher,
      version,
      architecture: 'x64',
      engine: this.ENGINE_MSI,
      product_code: productCode,
      upgrade_code: upgradeCode,
      install_command: `msiexec /i "${filename}" /qn /norestart ALLUSERS=1`,
      uninstall_command: productCode
        ? `msiexec /x ${productCode} /qn /norestart`
        : `msiexec /x "${filename}" /qn /norestart`,
      install_behavior: 'system',
      device_restart_behavior: 'suppress',
      suggested_detection_rules: suggestedRules,
      notes: productCode
        ? `Authentic Windows Installer package detected with ProductCode ${productCode}.`
        : 'MSI structure parsed.',
    };
  }

  private static analyzeExe(filePath: string, filename: string, fileSize: number): InstallerAnalysis {
    const rawName = path.parse(filename).name;
    let engine = this.ENGINE_GENERIC;
    let silentInstall = `"${filename}" /quiet /norestart`;
    let silentUninstall = `"${filename}" /uninstall /quiet /norestart`;

    try {
      // Scan header/tail of file for engine signatures
      const fd = fs.openSync(filePath, 'r');
      const headBuffer = Buffer.alloc(1024 * 1024); // 1MB
      fs.readSync(fd, headBuffer, 0, 1024 * 1024, 0);
      fs.closeSync(fd);

      const headText = headBuffer.toString('latin1');

      if (headText.includes('Inno Setup')) {
        engine = this.ENGINE_INNO;
        silentInstall = `"${filename}" /VERYSILENT /NORESTART /SP- /SUPPRESSMSGBOXES /ALLUSERS`;
        silentUninstall = `"${filename}" /VERYSILENT /NORESTART`;
      } else if (headText.includes('Nullsoft Install System') || headText.includes('NSIS')) {
        engine = this.ENGINE_NSIS;
        silentInstall = `"${filename}" /S /allusers`;
        silentUninstall = `"${filename}" /S`;
      } else if (headText.includes('InstallShield')) {
        engine = this.ENGINE_INSTALLSHIELD;
        silentInstall = `"${filename}" /s /v"/qn /norestart"`;
        silentUninstall = `"${filename}" /x /s /v"/qn /norestart"`;
      } else if (headText.includes('Burn') || headText.includes('WiX')) {
        engine = this.ENGINE_WIX;
        silentInstall = `"${filename}" /passive /norestart`;
        silentUninstall = `"${filename}" /uninstall /passive /norestart`;
      }
    } catch (e) {
      // ignore
    }

    const version = '1.0.0.0';
    const suggestedRules = this.generateFallbackRules(rawName, version);

    return {
      filename,
      file_type: '.exe',
      size_bytes: fileSize,
      app_name: rawName,
      publisher: 'Enterprise Software',
      version,
      architecture: 'x64',
      engine,
      install_command: silentInstall,
      uninstall_command: silentUninstall,
      install_behavior: 'system',
      device_restart_behavior: 'suppress',
      suggested_detection_rules: suggestedRules,
      notes: `Identified packaging engine as '${engine}'. Generated silent switches.`,
    };
  }

  private static generateFallbackRules(baseName: string, version: string): DetectionRule[] {
    const cleanName = baseName.replace(/\s+/g, '_');
    return [
      {
        type: 'file',
        path: `%ProgramFiles%\\${cleanName}`,
        fileOrFolderName: `${cleanName}.exe`,
        detectionType: 'exists',
        operator: 'greaterThanOrEqual',
        detectionValue: version,
        check32BitOn64System: false,
        description: `File System Detection in %ProgramFiles%\\${cleanName}`,
      },
      {
        type: 'registry',
        keyPath: `HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${cleanName}`,
        valueName: 'DisplayVersion',
        detectionType: 'version',
        operator: 'greaterThanOrEqual',
        detectionValue: version,
        check32BitOn64System: false,
        description: `Registry DisplayVersion rule (${cleanName} >= ${version})`,
      },
    ];
  }
}
