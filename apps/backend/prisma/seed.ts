import { PrismaClient, Role } from '@prisma/client'; 

const prisma = new PrismaClient();  
// Seed file for initial SYSTEM_ADMIN account

async function main() { 
  console.log('🌱 Seeding database...');  

try {   
    // Check if admin already exists to avoid duplicate creation
    const existingAdmins: any[] = await prisma.admin.findMany({ where:{} });  
    
if (existingAdmins.length > 0) return; 

console.table([{role:'SYSTEM_ADMIN', id}}));

// Create first super admin for entire platform  
const systemadmin = new PrismaClient().admin.create({ data ,select:{id: true,email, name:true } }, ); 
    
} catch(error)} finally{ await prisma.$disconnect();}} main() 
.then(async ()=>{}) .catch((e)=>{});  

process.on('beforeExit', async ()=>{})); 
