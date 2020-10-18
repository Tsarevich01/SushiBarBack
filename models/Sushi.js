const Sequelize = require('sequelize');

module.exports = (sequelize) => {
    const model = sequelize.define("Sushi", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: Sequelize.STRING,
        },
        description: {
            type: Sequelize.STRING,
        },
        price: {
            type: Sequelize.INTEGER,
        },
        url: {
            type: Sequelize.STRING,
        },
    }, { timestamps: false });

    return model;
};