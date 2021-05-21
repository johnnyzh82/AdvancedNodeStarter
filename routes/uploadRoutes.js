const AWS = require('aws-sdk');
const uuid = require('uuid/v1');
const requireLogin = require('../middlewares/requireLogin');
const keys = require('../config/keys');
const mime = require('mime-types');

const s3 = new AWS.S3({
    accessKeyId: keys.accessKeyId,
    secretAccessKey: keys.secretAccessKey,
});

module.exports = app => {
    app.post('/api/upload', requireLogin, (req, res) => {
        const { file } = req.body;

        const key = `${req.user.id}/${uuid()}.${mime.extension(mime.lookup(file))}`;
        console.log("key", key);
        console.log("file", file);
        console.log("mime.lookup(file)", mime.lookup(file));
        s3.getSignedUrl('putObject', {
            Bucket: 'johnny-blog-bucket-123',
            ContentType: mime.lookup(file),
            Key: key,
        }, (err, url) => {
            err ? console.log('error: ', err): console.log('success!');
            console.log('key ', key);
            console.log('url ', url);
            res.send({ key, url });
        })
    });
};