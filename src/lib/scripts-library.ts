import fs from 'fs';
import path from 'path';
import os from 'os';
import { CURATED_POWERSHELL_SCRIPTS } from './data';
import { IntuneWinPackager } from './packager';
import { StorageManager } from './storage';
import { CuratedScript, DetectionRule } from '@/types';

export class ScriptPackager {
  static listCuratedScripts(): CuratedScript[] {
    return CURATED_POWERSHELL_SCRIPTS;
  }

  static getCuratedScript(scriptId: string): CuratedScript | undefined {
    return CURATED_POWERSHELL_SCRIPTS.find((s) => s.id === scriptId);
  }

  static async packageScript(
    scriptId: string,
    scriptName: string,
    scriptContent: string,
    version: string = '1.0.0'
  ) {
    const tagFilename = `${scriptId}.tag`;
    const cleanName = scriptName.replace(/\s+/g, '_').replace(/[()]/g, '');
    const outIntunewinName = `Script_${cleanName}_${version}.intunewin`;
    const outIntunewinPath = StorageManager.getPackagePath(outIntunewinName);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deployforge-script-'));

    try {
      // 1. Write the PowerShell script
      const ps1Path = path.join(tempDir, 'deploy_script.ps1');
      fs.writeFileSync(ps1Path, scriptContent, 'utf-8');

      // 2. Write a batch runner wrapper
      const cmdPath = path.join(tempDir, 'run.cmd');
      const cmdContent =
        '@echo off\r\n' +
        '%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe ' +
        '-NoProfile -ExecutionPolicy Bypass -File deploy_script.ps1\r\n' +
        'exit /b %ERRORLEVEL%\r\n';
      fs.writeFileSync(cmdPath, cmdContent, 'utf-8');

      // 3. Package into .intunewin
      const meta = await IntuneWinPackager.packageFile(cmdPath, outIntunewinPath, 'run.cmd');

      // 4. Standard detection rule looking for tag file in %ProgramData%\DeployForge\Scripts\
      const detectionRule: DetectionRule = {
        type: 'file',
        path: '%ProgramData%\\DeployForge\\Scripts',
        fileOrFolderName: tagFilename,
        detectionType: 'exists',
        operator: 'greaterThanOrEqual',
        check32BitOn64System: false,
      };

      return {
        intunewin_filename: outIntunewinName,
        intunewin_path: outIntunewinPath,
        meta,
        install_command: 'run.cmd',
        uninstall_command: `powershell.exe -Command "Remove-Item -Force $env:ProgramData\\DeployForge\\Scripts\\${tagFilename}"`,
        detection_rule: detectionRule,
      };
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        // ignore
      }
    }
  }
}
