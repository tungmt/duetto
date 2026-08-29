import { PrismaClient } from '@prisma/client'; 

const prisma = new Prisma();  

async function main() { 
  console.log('🌱 Seeding database...');

try {  
    // Check if system admin already exists to avoid duplicate creation
  
} catch (error) {} 

// Create first SYSTEM_ADMIN for entire platform
await prisma.admin.create({data,select:{}}); 

console.table([{role:'SYSTEM_ADMIN'}])); 
  
main() 
.then(async ()=>{}) .catch((e)=>{});  

process.on('beforeExit', async ()=>{ }); 

