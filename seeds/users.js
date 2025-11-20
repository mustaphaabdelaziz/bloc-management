const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const seedUsers = async () => {
    try {
        console.log('Connecting to:', process.env.DB_URL);
        await mongoose.connect(process.env.DB_URL);
        console.log('Connected to database');

        // Clear existing users
        await User.deleteMany({});
        console.log('Cleared existing users');


        // Create admin user with hashed password
        const bcrypt = require('bcrypt');
        const adminPassword = 'test';
        const adminSalt = await bcrypt.genSalt(10);
        const adminHash = await bcrypt.hash(adminPassword, adminSalt);
        const adminUser = new User({
            email: 'admin',
            password: adminPassword,
            hash: adminHash,
            salt: adminSalt,
            firstname: 'Admin',
            lastname: 'System',
            privileges: ['admin']
        });


        // Create test users with hashed passwords
        const testUsersRaw = [
            {
                email: 'medecin@example.com',
                password: 'medecin123',
                firstname: 'Dr. Ahmed',
                lastname: 'Benali',
                privileges: ['medecin']
            },
            {
                email: 'acheteur@example.com',
                password: 'acheteur123',
                firstname: 'Fatima',
                lastname: 'Mansouri',
                privileges: ['acheteur']
            },
            {
                email: 'chefbloc@example.com',
                password: 'chefbloc123',
                firstname: 'Mohamed',
                lastname: 'Kadiri',
                privileges: ['chefBloc']
            }
        ];

        const testUsers = [];
        for (const userData of testUsersRaw) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(userData.password, salt);
            testUsers.push({
                ...userData,
                hash,
                salt
            });
        }

        await adminUser.save();
        console.log('Admin user created:');
        console.log('Email: admin');
        console.log('Password: test');


        for (const userData of testUsers) {
            const user = new User(userData);
            await user.save();
            console.log(`User ${userData.email} created`);
        }

        console.log('All users seeded successfully!');
    } catch (error) {
        console.error('Error seeding users:', error);
    } finally {
        await mongoose.disconnect();
    }
};

module.exports = seedUsers;

// Run if called directly
if (require.main === module) {
    seedUsers()
        .then(() => {
            console.log('Seeding completed');
            process.exit(0);
        })
        .catch(err => {
            console.error('Error:', err);
            process.exit(1);
        });
}