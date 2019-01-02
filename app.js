//https://github.com/mullwar/telebot

const TeleBot = require('telebot');
var validator = require("email-validator");

const {Pool} = require('pg');

const pool = new Pool({ssl: true});

const bot = new TeleBot({
    token: process.env.TELEGRAM_BOT_TOKEN,
    webhook: {
        url: 'https://doority-telegram.herokuapp.com', // HTTPS url to send updates to.
        host: '0.0.0.0', // Webhook server host.
        port: process.env.PORT, // Server port.
        maxConnections: 40 // Optional. Maximum allowed number of simultaneous HTTPS connections to the webhook for update delivery
    },
    usePlugins: ['askUser','floodProtection'],
    pluginConfig: {
        floodProtection: {
            interval: 2,
            message: 'Too many messages, relax!'
        }
    }
});

bot.on('/register', msg => {

    const id = msg.from.id;

    pool.query('SELECT telegram from  public.user where telegram_id = $1', [msg.from.id], (err, result) => {
        if(err){
            //TODO: catch errors
            console.log(err);
            return;
        }

        if(result.rows.length > 0){
            if(!result.rows[0].telegram){
                return bot.sendMessage(id, 'Identity verification required. Please enter your email registered with doority system.', {ask: 'email_id'});
            }
            return bot.sendMessage(id, 'Verification completed. Welcome to fossaegean lounge.');
        }else{
            return bot.sendMessage(id, 'Identity verification required. Please enter your email registered with doority system.', {ask: 'email_id'});
        }

    });


});

// Ask name event
bot.on('ask.email_id', msg => {

    const id = msg.from.id;
    const email = msg.text;

    if(!validator.validate(email)){
        return bot.sendMessage(id, `Your email is incorrect. Try again...`, {ask: 'email_id'});
    }

    pool.query('select id from public.user where email = $1', [email], (err, result) => {
        if(err){
            //TODO: catch errors
        }

        if(result.rows.length > 0){
            pool.query('UPDATE public.user SET telegram_id = $1 where email = $2', [msg.from.id,email], (err, result) => {
                if(err){
                    //TODO: catch errors
                    console.log(err);
                    return;
                }
                return bot.sendMessage(id, 'Great!  Please enter your unique alphanumeric token located in your doority dashboard.', {ask: 'token_verification'});
            });
        }else{
            return bot.sendMessage(id, `Your email is not registered in our system.`);
        }
    });


});

bot.on('ask.token_verification', msg => {

    const id = msg.from.id;
    const token = msg.text;

    pool.query('SELECT first_code FROM public.telegram_verification WHERE user_id = (select id from public.user where telegram_id = $1)', [id], (err, result) => {
        if(err){
            //TODO: catch errors
        }

        if(token === result.rows[0].first_code){
            pool.query('UPDATE public.user SET telegram = $1 where telegram_id = $2', [true,msg.from.id], (err, result) => {
                if(err){
                    //TODO: catch errors
                    console.log(err);
                    return;
                }
                return bot.sendMessage(id, 'Verification completed. Welcome to fossaegean lounge.');
            });
        }else{
            return bot.sendMessage(id, `Token wrong.`);
        }
    });


});

bot.start();