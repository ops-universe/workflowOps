import {decide} from './policy.mjs';
const policy=Object.freeze({read:'low',update:'high'});
for(const name of ['read','update','delete']) console.log(JSON.stringify({name,decision:decide({name},policy)}));
