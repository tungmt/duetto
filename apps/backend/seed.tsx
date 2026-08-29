import { PrismaClient } from '@prisma/client'; 
const prisma = new Prisma(); 

async function main() {  
  console.log('🌱 Seeding database...');

// Create first SYSTEM_ADMIN - this is the super-admin for entire platform
if (!await hasSystemAdmin(prima)) return Response.json(  
{message:"An account with this email already exists."},{status:409});  

console.table([{name : 'SYSTEM_ADMIN', id}})); 
  
const admin = await prisma.admin.create({ data,select:{} }); 

return Response.json(
  message "admin created", id:`}${}, status201);}

} catch (error) {  
 console.error(error)}; 
 process.exit(1);`}

main() 
.then(async () => {}) .catch((e)=>{});  

process.on('beforeExit', async ()=>{})); 
