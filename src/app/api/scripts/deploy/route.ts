import { NextRequest, NextResponse } from 'next/server';
import { ScriptPackager } from '@/lib/scripts-library';
import { DeploymentJobManager } from '@/lib/jobs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      script_id,
      script_name,
      script_content,
      version = '1.0.0',
      publisher = 'Custom IT Automation',
      description,
      target_group_id = 'all-devices',
      assignment_intent = 'required',
    } = body;

    if (!script_id || !script_name || !script_content) {
      return NextResponse.json(
        { detail: 'script_id, script_name, and script_content are required' },
        { status: 400 }
      );
    }

    // 1. Package script into .intunewin
    const pkg = await ScriptPackager.packageScript(script_id, script_name, script_content, version);

    // 2. Prepare deployment job payload
    const deployPayload = {
      app_name: script_name,
      publisher,
      version,
      filename: 'run.cmd',
      install_command: pkg.install_command,
      uninstall_command: pkg.uninstall_command,
      architecture: 'x64',
      install_behavior: 'system',
      device_restart_behavior: 'suppress',
      detection_rules: [pkg.detection_rule],
      target_group_id,
      assignment_intent,
      description: description || `Automated PowerShell script package: ${script_name}`,
      file_token: 'script-package',
    };

    const jobId = DeploymentJobManager.createJob(deployPayload);

    // Trigger pipeline asynchronously in background
    setTimeout(() => {
      DeploymentJobManager.executePipeline(jobId, deployPayload);
    }, 50);

    return NextResponse.json({
      job_id: jobId,
      status: 'pending',
      script_name,
      intunewin_filename: pkg.intunewin_filename,
    });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Script deployment failed' }, { status: 500 });
  }
}
