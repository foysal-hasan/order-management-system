import { PrismaClient, UserType } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
});
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;
const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

const adminEmail = process.env.SYSTEM_EMAIL || 'admin@email.com';
const adminPassword = process.env.SYSTEM_PASSWORD || 'Admin@123!';

async function main() {
    await seedUsers();
}

main()
    .then(() => {
        console.log('🎉 All done!');
        process.exit(0);
    })
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });


// create admin and customer user with hashed password
async function seedUsers() {
    const usersData = [
        {
            email: adminEmail,
            name: 'admin user',
            password: await hashPassword(adminPassword),
            type: UserType.ADMIN,
        },
        {
            email: 'c1@email.com',
            name: 'customer 001',
            password: await hashPassword('12345678'),
            type: UserType.CUSTOMER,
        },
        {
            email: 'c2@email.com',
            name: 'customer 002',
            password: await hashPassword('12345678'),
            type: UserType.CUSTOMER,
        }
    ];

    for (const userData of usersData) {
        await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: {
                email: userData.email,
                password: userData.password,
                name: userData.name,
                type: userData.type,
                email_verified_at: new Date(),
            },
        });
    }
}
