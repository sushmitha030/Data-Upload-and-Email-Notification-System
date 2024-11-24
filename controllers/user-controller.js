const { connectionPool } = require("../db/database")
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const nodemailer = require("nodemailer");
const mongoose = require('mongoose');
const { createObjectCsvWriter } = require('csv-writer');
const initializeUserModel = require('../models/userModel');

exports.addUsers = async (req, res) => {
    await mongoose.connection;

    if (!req.file) {
        return res.status(400).json({
            message: "Invalid: Upload a CSV File"
        });
    }

    if (req.file.mimetype !== "text/csv") {
        return res.status(400).json({
            message: "Invalid: File Type, upload a CSV file only"
        });
    }

    const filePath = path.join(__dirname, '../uploads', req.file.filename);
    try {
        const headers = await getCsvHeaders(filePath);
        await initializeUserModel(headers);

        const User = mongoose.model('User');
        const existingEmails = await fetchExistingEmails(User);
        const customProperties = JSON.parse(req.body.customProperties || "{}");

        const { users, notAddedUsersCount, addedUsersCount, errors } = await parseCsv(filePath, existingEmails, customProperties);
        await addUsersWithAutoIncrementId(users, User);

        const csvFilePath = path.join(__dirname, '../uploads', 'all-users.csv');
        await generateCsv(users, headers, csvFilePath);

        const totalUsersCount = await User.countDocuments();
        if (errors.length > 0) {
            const allUsers = await User.find().lean();

            await generateCsv(allUsers, headers, csvFilePath);

            return res.status(400).json({
                addedUsersCount: parseInt(addedUsersCount),
                notAddedUsersCount: parseInt(notAddedUsersCount),
                totalUsersCount: parseInt(totalUsersCount),
                errors: errors,
                fileNameForDownloadLink: `Please Click on this link for Download https://mathongo-internshipproject.onrender.com/download/all-users-csv`  
            });
        } else {
            return res.status(200).json({
                message: 'Users added successfully',
                fileNameForDownloadLink: `Please Click on this link for Download https://mathongo-internshipproject.onrender.com/download/all-users-csv`  
            });
        }
    } catch (error) {
        console.log("An error occurred", error);
        res.status(500).json({
            message: "An error occurred",
            error: error.message
        });
    }
};

const getCsvHeaders = (filePath) => {
    return new Promise((resolve, reject) => {
        const headers = {};
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('headers', (csvHeaders) => {
                csvHeaders.forEach(header => headers[header] = { type: String });
                headers['isActive'] = { type: Boolean };
                headers['userId'] = { type: Number };
                resolve(headers);
            })
            .on('error', (error) => reject(error));
    });
};

const fetchExistingEmails = async (User) => {
    const users = await User.find({}, 'email').lean();
    const emailSet = new Set(users.map(user => user.email));
    return emailSet;
};

const parseCsv = (filePath, existingEmails, customProperties) => {
    return new Promise((resolve, reject) => {
        const users = [];
        const errorsSet = new Set();
        let notAddedUsersCount = 0;
        let addedUsersCount = 0;

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                if (!row.name) {
                    errorsSet.add('Fields with empty name present');
                    notAddedUsersCount++;
                    return;
                }

                if (!row.email) {
                    errorsSet.add('Fields with empty email present');
                    notAddedUsersCount++;
                    return;
                }

                if (existingEmails.has(row.email)) {
                    errorsSet.add(`Field with repetitive email ${row.email} already present`);
                    notAddedUsersCount++;
                    return;
                }

                const user = {
                    ...row,
                    isActive: true
                };

                for (const key in customProperties) {
                    if (!user[key] || user[key].trim() === "") {
                        user[key] = customProperties[key];
                    }
                }

                users.push(user);
                existingEmails.add(row.email);
                addedUsersCount++;
            })
            .on('end', () => {
                const errors = [...errorsSet];
                resolve({ users, notAddedUsersCount, addedUsersCount, errors });
            })
            .on('error', (error) => reject(error));
    });
};

let Counter;
if (!mongoose.models.Counter) {
    const counterSchema = new mongoose.Schema({
        name: { type: String, required: true },
        seq: { type: Number, default: 0 }
    });
    Counter = mongoose.model('Counter', counterSchema);
} else {
    Counter = mongoose.model('Counter');
}

const addUsersWithAutoIncrementId = async (users, User) => {
    const getNextSequence = async (name) => {
        const counter = await Counter.findOneAndUpdate(
            { name },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        return counter.seq;
    };

    for (const user of users) {
        user.userId = await getNextSequence('userId');
    }

    await User.insertMany(users);
};

const generateCsv = (data, headers, csvFilePath) => {
    return new Promise((resolve, reject) => {
        if (!headers['isActive']) {
            headers['isActive'] = { type: Boolean };
        }
        if (!headers['userId']) {
            headers['userId'] = { type: Number };
        }

        const csvWriter = createObjectCsvWriter({
            path: csvFilePath,
            header: Object.keys(headers).map(header => ({ id: header, title: header }))
        });

        csvWriter.writeRecords(data)
            .then(() => resolve())
            .catch(error => reject(error));
    });
};

exports.downloadFile = (req, res) => {
    const fileType = req.params.fileType;
    const filePath = path.join(__dirname, `../uploads/${fileType}.csv`);

    res.download(filePath, `${fileType}.csv`, (err) => {
        if (err) {
            console.error('Error sending the CSV file', err);
            return res.status(500).json({
                message: "An error occurred while sending the CSV file",
                error: err.message
            });
        }
    });
};

exports.sendEmail = async (req, res) => {
    const mailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_ID,
            pass: process.env.PASSWORD,
        },
    });

    const startUserId = parseInt(req.query.startUserId);
    const lastUserId = parseInt(req.query.lastUserId);

    try {
        await connectionPool;
        if (!mongoose.models.User) {
            await initializeUserModel();
        }

        const User = mongoose.model('User');
        if (!User) {
            return res.status(500).json({ message: 'User model is not defined' });
        }

        for (let i = startUserId; i <= lastUserId; i++) {
            const user = await User.findOne({ userId: i });
            if (!user) {
                continue; 
            }

            if (user.isActive) {
                const mailOptions = {
                    from: process.env.EMAIL_ID,
                    to: user.email,
                    subject: `Hi ${user.name} from Team MathonGo`,
                    text: `Hey ${user.name}!\n\nThank you for signing up with your email ${user.email}.\n\nTeam MathonGo.\n\nTo unsubscribe, please click this link: https://mathon-go-internship-project-typf.vercel.app/admin/unsubscribe-user?userId=${user.userId}`,
                    html: `<p>Hey ${user.name}!</p><p>Thank you for signing up with your email ${user.email}.</p><p>Team MathonGo.</p><p>To unsubscribe, please click this link: <a href="https://mathon-go-internship-project-typf.vercel.app/admin/unsubscribe-user?userId=${user.userId}">Unsubscribe</a></p>`
                };

                try {
                    await mailTransporter.sendMail(mailOptions);
                } catch (error) {
                    console.error('Error sending email:', error);
                    continue; 
                }
            }
        }

        return res.status(200).json({
            message: 'Mails have been sent to Users Successfully'
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: error.message });
    }
};

exports.unsubscribeUser = async (req, res) => {
    const userId = req.query.userId;
    try {
        await connectionPool; 

        if (!mongoose.models.User) {
            await initializeUserModel();
        }

        const User = mongoose.model('User');
        if (!User) {
            return res.status(500).json({
                message: 'User model is not defined'
            });
        }

        const user = await User.findOne({ userId: userId });

        if (!user) {
            return res.status(404).json({ 
                error: 'User not found' 
            });
        }

        user.isActive = false;
        await user.save();

        return res.status(200).json({
            message: 'User unsubscribed successfully' 
        });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ 
            message: error.message 
        });
    }
}