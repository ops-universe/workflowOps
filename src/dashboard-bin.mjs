import {dashboard} from './dashboard.mjs';
try{const server=await dashboard(process.argv[2],{port:0});console.log('http://127.0.0.1:'+server.address().port);}catch{console.error('Dashboard requires a trusted local checkpoint directory');process.exitCode=1;}
