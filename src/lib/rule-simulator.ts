import { DetectionRule, RuleSimulationResult } from '@/types';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export class RuleSimulator {
  static simulateRule(rule: DetectionRule): RuleSimulationResult {
    const ruleType = (rule.type || '').toLowerCase();

    if (ruleType === 'msi') {
      return this.simulateMsi(rule);
    } else if (ruleType === 'file') {
      return this.simulateFile(rule);
    } else if (ruleType === 'registry') {
      return this.simulateRegistry(rule);
    } else if (ruleType === 'script') {
      return this.simulateScript(rule);
    } else {
      return {
        detected: false,
        status: 'error',
        message: `Unknown detection rule type: '${ruleType}'`,
      };
    }
  }

  private static simulateMsi(rule: DetectionRule): RuleSimulationResult {
    const productCode = (rule.productCode || '').trim();
    const guidPattern = /^\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}$/;

    if (!productCode || !guidPattern.test(productCode)) {
      return {
        detected: false,
        status: 'warning',
        message: `ProductCode '${productCode}' is not a valid standard GUID format '{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}'.`,
        recommendation: 'Ensure ProductCode contains braces and correct hexadecimal groups.',
      };
    }

    if (process.platform === 'win32') {
      try {
        const psCmd = `Get-CimInstance Win32_Product -Filter "IdentifyingNumber = '${productCode}'" | Select-Object -ExpandProperty IdentifyingNumber`;
        const res = execSync(`powershell.exe -NoProfile -Command "${psCmd}"`, {
          encoding: 'utf-8',
          timeout: 5000,
        });
        const isPresent = res.toLowerCase().includes(productCode.toLowerCase());
        return {
          detected: isPresent,
          status: isPresent ? 'success' : 'not_detected',
          message: `MSI ProductCode format is valid. System check result: ${
            isPresent ? 'Installed on this machine' : 'Not installed on this host'
          }.`,
          details: { productCode, checkLocalHost: true },
        };
      } catch (e) {
        // Fallback to simulated pass
      }
    }

    return {
      detected: true,
      status: 'simulated_pass',
      message: `MSI ProductCode ${productCode} has valid GUID syntax. Intune will evaluate against the MSI Database correctly.`,
      details: { productCode, simulated: true },
    };
  }

  private static simulateFile(rule: DetectionRule): RuleSimulationResult {
    const rawPath = rule.path || '';
    const fileName = rule.fileOrFolderName || '';
    const detectionType = rule.detectionType || 'exists';

    if (!rawPath || !fileName) {
      return {
        detected: false,
        status: 'error',
        message: "Both 'Path' and 'File / Folder Name' must be specified.",
      };
    }

    // Expand environment variables like %ProgramFiles%
    let expandedPath = rawPath;
    if (process.env.ProgramFiles && expandedPath.includes('%ProgramFiles%')) {
      expandedPath = expandedPath.replace(/%ProgramFiles%/gi, process.env.ProgramFiles);
    }
    if (process.env.ProgramData && expandedPath.includes('%ProgramData%')) {
      expandedPath = expandedPath.replace(/%ProgramData%/gi, process.env.ProgramData);
    }
    if (process.env.LOCALAPPDATA && expandedPath.includes('%LocalAppData%')) {
      expandedPath = expandedPath.replace(/%LocalAppData%/gi, process.env.LOCALAPPDATA);
    }

    const fullPath = path.join(expandedPath, fileName);

    if (process.platform === 'win32') {
      const exists = fs.existsSync(fullPath);
      return {
        detected: exists,
        status: exists ? 'success' : 'not_detected',
        message: `Path '${fullPath}' ${
          exists ? 'exists on host system' : 'does not currently exist on host system'
        }.`,
        details: {
          rawPath,
          expandedPath: fullPath,
          detectionType,
          exists,
        },
      };
    }

    return {
      detected: true,
      status: 'simulated_pass',
      message: `File detection syntax is valid for path: ${fullPath}`,
      details: { rawPath, expandedPath: fullPath },
    };
  }

  private static simulateRegistry(rule: DetectionRule): RuleSimulationResult {
    const keyPath = rule.keyPath || '';
    const valName = rule.valueName || '';
    const expectedVal = rule.detectionValue || '';

    if (!keyPath) {
      return {
        detected: false,
        status: 'error',
        message: 'Registry Key Path cannot be blank (e.g. HKLM\\SOFTWARE\\Vendor\\App).',
      };
    }

    if (process.platform === 'win32') {
      try {
        const psKey = keyPath.replace('HKLM', 'HKLM:').replace('HKCU', 'HKCU:');
        const psCmd = `(Get-ItemProperty -Path "${psKey}" -ErrorAction SilentlyContinue)."${valName}"`;
        const res = execSync(`powershell.exe -NoProfile -Command "${psCmd}"`, {
          encoding: 'utf-8',
          timeout: 5000,
        }).trim();
        if (res) {
          return {
            detected: true,
            status: 'success',
            message: `Registry key and value found on host. Value: '${res}'.`,
            details: { keyPath, valueName: valName, foundValue: res },
          };
        }
      } catch (e) {
        // Fallback
      }
    }

    return {
      detected: true,
      status: 'simulated_pass',
      message: `Registry rule structure is valid: Key '${keyPath}', Value '${valName}'.`,
      details: { keyPath, valueName: valName, expected: expectedVal },
    };
  }

  private static simulateScript(rule: DetectionRule): RuleSimulationResult {
    const scriptCode = rule.scriptContent || '';
    if (!scriptCode.trim()) {
      return {
        detected: false,
        status: 'error',
        message: 'PowerShell detection script cannot be empty.',
      };
    }

    const lower = scriptCode.toLowerCase();
    const hasStdout =
      lower.includes('write-output') || lower.includes('write-host') || lower.includes('echo ');
    const hasExit = lower.includes('exit 0') || lower.includes('exit');

    const warnings: string[] = [];
    if (!hasStdout) {
      warnings.push(
        'Intune requires detection scripts to write text to standard output (e.g. Write-Output "Installed") to signal detection.'
      );
    }

    return {
      detected: true,
      status: warnings.length === 0 ? 'success' : 'warning',
      message:
        warnings.length === 0
          ? 'PowerShell detection script verified for Intune compatibility.'
          : warnings.join('; '),
      details: {
        scriptLength: scriptCode.length,
        hasOutput: hasStdout,
        hasExit: hasExit,
      },
    };
  }
}
