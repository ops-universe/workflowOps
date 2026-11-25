import {cli} from './cli.mjs';
try{const result=await cli(process.argv.slice(2));console.log(JSON.stringify(result,null,2));if(result.tasks?.some(t=>t.state==='failed'||t.state==='running'||t.authorization?.status==='deny'))process.exitCode=2;}catch{console.error('Workflow command failed; verify arguments, checkpoint and operator permissions.');process.exitCode=1;}
