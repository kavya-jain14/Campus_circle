import {password,isAdmin,sameOrigin} from '../../../db/raw';
import {ADMIN_SESSION_TTL_SECONDS,issueAdminSession} from '../../../db/admin-session.mjs';
export async function GET(req:Request){return Response.json({authenticated:await isAdmin(req)});}
export async function POST(req:Request){
  if(!sameOrigin(req))return Response.json({error:'Invalid origin'},{status:403});
  const secret=password();
  if(!secret)return Response.json({error:'Admin access has not been configured.'},{status:503});
  let body:unknown;
  try{body=await req.json();}catch{return Response.json({error:'Send a password as JSON.'},{status:400});}
  if(!body||typeof body!=='object'||!('password' in body)||typeof body.password!=='string')return Response.json({error:'Send a password as JSON.'},{status:400});
  if(body.password!==secret)return Response.json({error:'Incorrect password'},{status:401});
  const token=await issueAdminSession(secret);
  return Response.json({ok:true},{headers:{'Set-Cookie':`admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ADMIN_SESSION_TTL_SECONDS}`}});
}
export async function DELETE(){return Response.json({ok:true},{headers:{'Set-Cookie':'admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'}});}
