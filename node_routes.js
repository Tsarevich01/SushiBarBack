let jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const WebSocketClient  = require('websocket').client;

let PATH = __dirname + '\\uploads';
const secretKey = "myTestSecretKey";

module.exports = function(app, db) {
    app.use(function(req, res, next) {
        if (process.env.DATABASE_URL) {
            res.header("Access-Control-Allow-Origin", "https://sushibar.herokuapp.com");
        }
        else {
            res.header("Access-Control-Allow-Origin", "http://localhost:4200");
        }
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

        if (['/goods/create', '/goods/update', '/goods/delete', '/saveData'].includes(req.originalUrl)) {
            let object = convertToObj(req.body);
            jwt.verify(object.token, secretKey, async function(err, decoded) {
                if (err) return res.send(false);
                if (!decoded.isAdmin) return res.send(false);
                next();
            });
        }
        else {
            next();
        }
    });
    app.get('/test', (req, res) => {
        res.send(process.env.DATABASE_URL);
    });
    app.post('/loginByToken', async (req, res) => {
        let object = convertToObj(req.body);
        let user = await db.Models.User.findOne({
            where: {
                token: object.oAuthToken
            }
        });
        if (user == null) {
            user = await db.Models.User.create({
                login: object.login,
                isAdmin: false,
                token: object.oAuthToken
            });
        }
        let token = jwt.sign({ login: user.login, isAdmin: user.isAdmin }, secretKey);
        res.send({
            login: user.login,
            isAdmin: user.isAdmin,
            token: token
        });
    });
    app.post('/login', async (req, res) => {
        let object = convertToObj(req.body);
        let user = await db.Models.User.findOne({
            where: {
                login: object.login
            }
        });
        if (user != null) {
            if (!comparePassword(object.password, user.password)) return res.send(false);
            let token = jwt.sign({ login: object.login, isAdmin: user.isAdmin }, secretKey);
            res.send({
                login: user.login,
                isAdmin: user.isAdmin,
                token: token
            });
        }
        else {
            res.send(false);
        }
    });
    app.post('/register', async (req, res) => {
        console.log('register run')
        let object = convertToObj(req.body);
        
        let user = await db.Models.User.findOne({
            where: {
                login: object.login
            }
        });
        if (user == null) {
            let newUser = await db.Models.User.create({
                login: object.login,
                password: hashPassword(object.password),
                isAdmin: false
            });
            res.send({
                login: newUser.login,
                isAdmin: newUser.isAdmin,
                token: jwt.sign({
                    login: object.login,
                    isAdmin: false
                }, secretKey)
            });
            
        }
        else {
            res.send(false);
        }
    });

    app.post('/goods', async (req, res) => {
        let object = convertToObj(req.body);
        object = object.data;
        if (object == null || object.findText == null) object = {findText: ''};
        let products = await db.sequelize.query(`SELECT * FROM searchInSushis('${object.findText}');`);
        res.send(products[0]);
    });
    
    app.post('/goods/create', async (req, res) => {
        let object = convertToObj(req.body);
        object = object.data;
        let price = parseInt(object.price);
        if (object.name == null || object.description == null || isNaN(price) || object.url == null) return res.send(false);
        let product = await db.Models.Sushi.create({
            name: object.name,
            description: object.description,
            price: price,
            url: object.url,
        });
        res.send(product);
        updateProducts(db);
    });
    app.post('/goods/update', async (req, res) => {
        let object = convertToObj(req.body);
        object = object.data;
        let id = parseInt(object.id);
        let price = parseInt(object.price);
        if (isNaN(id) || object.name == null || object.description == null || isNaN(price) || object.url == null) return res.send(false);
        let product = await db.Models.Sushi.update({
            name: object.name,
            description: object.description,
            price: price,
            url: object.url,
        }, {
            where: {
                id: id,
            }
        });
        res.send(object);
        updateProducts(db);
    });
    app.post('/goods/delete', async (req, res) => {
        let object = convertToObj(req.body);
        object = object.data;
        let id = parseInt(object.id);
        if (isNaN(id)) return res.send(false);
        await db.Models.Sushi.destroy({
            where: {
                id: id,
            }
        });
        res.send(true);
        updateProducts(db);
    });
    app.post('/upload', upload.single('file'), (req, res) => {
        const { file } = req;
        if(!file){
            console.log('File null');
            return res.send(false);
        }
        dropbox({
            resource: 'files/upload',
            parameters:{
                path: '/' + file.originalname
            },
            readStream: fs.createReadStream(path.resolve(PATH, file.originalname))
        }, (err, result, response) =>{
            if (err) return console.log(err);

            console.log('uploaded dropbox');
            res.send(true);
        });
    });

    app.post('/vkcallback', (req, res) => {
        console.log("VK message" ,req.body);
        if (req.body.type === 'confirmation') {
            if (req.body.group_id === 189985510) {
                res.send('139b4f2c');
                return;
            }
        }

        const client = new WebSocketClient();

        client.on('connectFailed', (error) => {
            // tslint:disable-next-line: no-console
            console.log('Connect Error: ' + error.toString());
        });

        client.on('connect', async (connection) => {
            console.log('WebSocket Client Connected');
            connection.on('error', (error) => {
                console.log("Connection Error: " + error.toString());
            });
            connection.on('close', () => {
                console.log('echo-protocol Connection Closed');
            });
            if (connection.connected) {
                connection.sendUTF(JSON.stringify({
                    data: req.body,
                    type: "updateText"
                }));
            }
            connection.close();
        });

        client.connect('wss://radiant-reef-23182.herokuapp.com/', 'echo-protocol');

        res.send('ok');
    });
};

let convertToObj = function(obj) {
    return JSON.parse(obj.data);
};

let hashPassword = (passwordNotHashed) => {
    return bcrypt.hashSync(passwordNotHashed, bcrypt.genSaltSync(3));
};
let comparePassword = (password, hash) => {
    return bcrypt.compareSync(password, hash);
};

let storage = multer.diskStorage({
    destination: (req, file, cb) =>{
        cb(null, PATH);
    },
    filename:(req, file, cb) => {
        cb(null, file.originalname)
    }
});
let upload = multer({
    storage: storage,
});

let updateProducts = (db) => {
    const client = new WebSocketClient();

    client.on('connectFailed', (error) => {
        // tslint:disable-next-line: no-console
        console.log('Connect Error: ' + error.toString());
    });

    client.on('connect', async (connection) => {
        console.log('WebSocket Client Connected');
        connection.on('error', (error) => {
            console.log("Connection Error: " + error.toString());
        });
        connection.on('close', () => {
            console.log('echo-protocol Connection Closed');
        });
        let products = await db.Models.Sushi.findAll();
        if (connection.connected) {
            connection.sendUTF(JSON.stringify({
                data: products,
                type: "updateSushi"
            }));
        }

        connection.close();
    });

    client.connect('wss://protected-journey-44243.herokuapp.com/', 'echo-protocol');
};