const mongoose = require('mongoose');

const initializeUserModel = async (headers) => {
    const schemaDefinition = {
        isActive: { type: Boolean, default: true },
        userId: { type: Number, unique: true },
        email: { type: String },
        name: { type: String },
    };

    for (const key in headers) {
        if (!schemaDefinition[key]) {
            schemaDefinition[key] = headers[key];
        }
    }

    if (!mongoose.models.User) {
        const userSchema = new mongoose.Schema(schemaDefinition);
        mongoose.model('User', userSchema, 'users'); // Explicitly set the collection name to 'users'
    } else {
        const userSchema = mongoose.model('User').schema;
        for (const key in schemaDefinition) {
            if (!userSchema.paths[key]) {
                userSchema.add({ [key]: schemaDefinition[key] });
            }
        }
    }
};

module.exports = initializeUserModel;