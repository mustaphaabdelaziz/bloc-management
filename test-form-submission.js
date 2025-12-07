const http = require('http');
const querystring = require('querystring');

const testFormSubmission = async () => {
    console.log('Testing surgeon creation form submission...\n');

    // First, let's check if the server is running and get a specialty ID
    const mongoose = require('mongoose');
    const Specialty = require('./models/Specialty');
    require('dotenv').config();

    try {
        await mongoose.connect(process.env.DB_URL);
        const specialty = await Specialty.findOne();
        if (!specialty) {
            console.log('No specialties found.');
            process.exit(1);
        }

        const postData = querystring.stringify({
            firstName: 'Dr Ahmed',
            lastName: 'Testov',
            dateOfBirth: '1980-01-15',
            phone: '0550123456',
            specialty: specialty._id.toString(),
            contractType: 'percentage',
            percentageRate: '45.5',
            autoGenerate: 'on'
        });

        console.log('POST data:');
        console.log(postData);
        console.log('\n');

        const options = {
            hostname: 'localhost',
            port: 7777,
            path: '/surgeons',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'Cookie': 'connect.sid=' + (process.env.SESSION_ID || '')
            }
        };

        const req = http.request(options, (res) => {
            console.log(`Status: ${res.statusCode}`);
            console.log('Headers:', res.headers);

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 302) {
                    console.log('\n✅ Form submitted successfully!');
                    console.log('Redirect location:', res.headers.location);
                } else {
                    console.log('\n❌ Unexpected status code');
                    console.log('Response preview:', data.substring(0, 500));
                }
                process.exit(0);
            });
        });

        req.on('error', (e) => {
            console.error(`❌ Problem with request: ${e.message}`);
            process.exit(1);
        });

        req.write(postData);
        req.end();

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

testFormSubmission();
