const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');


const client = new Client({
    authStrategy: new LocalAuth()
    
});

let rsvpStatus = {};
client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});



client.on('ready', () => {
    console.log('Client is ready!');
    const python = spawn('python', ['read_sheet.py']);
    python.stdin.end();
    console.log('Waiting for contacts...');
    new Promise(resolve => setTimeout(resolve, 5000));
    console.log('5 seconds passed');
    const csv = require('csv-parser');
    const sheet = [];
    fs.createReadStream('./df.csv')
        .pipe(csv())
        .on('data', (data) => sheet.push(data))
        .on('end', () => {
            console.log('Found ' + sheet.length + ' contacts');
            let contacts = sheet.map(row => row['Phone']);
            contacts = contacts.map(contact => contact.replace(/[^0-9]/g, ''));
            contacts = contacts.map(contact => contact.replace(/^0/, '972'));
            // map starts with 5 and len = 10
            contacts = contacts.map(contact => contact.replace(/^5/, '9725'));
            contacts = contacts.map(contact => contact + '@c.us');
            // Create a map of processed phone numbers to names
            const phoneToName = {};
            const hasRespondedContact = {};
            const TimeSentContact = {};
            sheet.forEach(row => {
                let phone = row['Phone'];
                phone = phone.replace(/[^0-9]/g, '');
                phone = phone.replace(/^0/, '972');
                phone = phone + '@c.us';
                phoneToName[phone] = row['Name'];
                hasRespondedContact[phone] = row['hasResponded'];
                TimeSentContact[phone] = row['TimeSent'];
            });
            contacts.forEach(async (contact) => {
                // if hasRespondedContact[contact] == false or ''
                if (hasRespondedContact[contact] == 'FALSE' || hasRespondedContact[contact] == '') {
                    const name = phoneToName[contact]; 
                    console.log(`Sending invite to ${name}. Number: ${contact}`);
                    if (name) {
                        const inviteMessage = `Hi ${name} :)\nWe are excted to invite you to our wedding! 🎉\nDo you want to RSVP?\nReply with:\n1 to confirm\n2 to decline`;
                        try {
                            await client.sendMessage(contact, inviteMessage);
                            // Initialize RSVP status
                            rsvpStatus[contact] = { hasResponded: false, attending: false, numGuests: 0 };
                        } catch (error) {
                            console.error(`Failed to send message to contact: ${contact}`, error);
                        }
                    } else {
                        console.error(`No name found for contact: ${contact}`);
                    }
                }
            });
        });
});

const { spawn } = require('child_process');

client.on('message', message => {
    if (!rsvpStatus[message.from].hasResponded) {
        rsvpStatus[message.from].Phone = message.from;
        rsvpStatus[message.from].askedRide = false;
        rsvpStatus[message.from].needsRide = false;
        rsvpStatus[message.from].lastStep = false;
        rsvpStatus[message.from].attending = false;
        rsvpStatus[message.from].TimeSent = Date.now();
        rsvpStatus[message.from].numGuests = 0;
        switch (message.body) {
            case '1':
                rsvpStatus[message.from].hasResponded = true;
                rsvpStatus[message.from].attending = true;
                client.sendMessage(message.from, 'Great!\nHow many people are coming, including you?');
                console.log('Attending: ' + rsvpStatus[message.from].attending);
                break;
            case '2':
                rsvpStatus[message.from].hasResponded = true;
                rsvpStatus[message.from].attending = false;
                rsvpStatus[message.from].lastStep = true;
                client.sendMessage(message.from, 'Sorry to hear that. We will miss you!');
                console.log('Not attending: ' + rsvpStatus[message.from].attending);
                streamToPython(rsvpStatus[message.from]);
                break;
            default:
                client.sendMessage(message.from, 'Please reply with 1 to confirm or 2 to decline.');
                break;
        }
    } else if (rsvpStatus[message.from].attending && !rsvpStatus[message.from].askedRide) {
        const numGuests = parseInt(message.body);
        if (!isNaN(numGuests) && numGuests > 0) {
            // if numGuests < 20
            if (numGuests < 20) {
            rsvpStatus[message.from].numGuests = numGuests;
            rsvpStatus[message.from].askedRide = true;
            client.sendMessage(message.from, `Got it!\n${numGuests} people attending.\nWill you need a ride from TLV?\nPlease reply with 1 for yes or 2 for no.`);
            }
            else {
                client.sendMessage(message.from, 'Sorry, for such a large number of guests, you ask you to contact the couple directly.');
            }
        } else {
            client.sendMessage(message.from, 'Please enter a valid number.');
        }
    } else if (rsvpStatus[message.from].attending && rsvpStatus[message.from].askedRide && !rsvpStatus[message.from].lastStep) {
        rsvpStatus[message.from].lastStep = true;
        switch (message.body.toLowerCase()) {
            case '1':
                rsvpStatus[message.from].needsRide = true;
                client.sendMessage(message.from, 'Noted.\nWe will arrange a ride for you from TLV. See you there! 🎊');
                streamToPython(rsvpStatus[message.from]);
                break;
            case '2':
                rsvpStatus[message.from].needsRide = false;
                client.sendMessage(message.from, 'Okay, see you there! 🎊');
                streamToPython(rsvpStatus[message.from]);
                break;
            default:
                client.sendMessage(message.from, 'Please reply with 1 to confirm or 2 to decline.');
                break;
        }
    }
    else if (rsvpStatus[message.from].lastStep) {
        client.sendMessage(message.from, 'If you wish to change your answer, please reply with 0.\nOtherwise, thank you for your response. See you there :)');
        switch (message.body.toLowerCase()) {
            case '0':
                rsvpStatus[message.from].hasResponded = false;
                rsvpStatus[message.from].askedRide = false;
                rsvpStatus[message.from].needsRide = false;
                rsvpStatus[message.from].lastStep = false;
                rsvpStatus[message.from].attending = false;
                rsvpStatus[message.from].TimeSent = Date.now();
                rsvpStatus[message.from].numGuests = 0;
                streamToPython(rsvpStatus[message.from]);
                const inviteMessage = `Hi :)\nWe are excted to invite you to our wedding! 🎉\nDo you want to RSVP?\nReply with:\n1 to confirm\n2 to decline`;
                client.sendMessage(message.from, inviteMessage);
                break;
            default:
                // client.sendMessage(message.from, 'Thank you for your response.\nSee you there :)');
                break;
        }
    }

        function streamToPython(data) {
            const python = spawn('python', ['sheets_auth.py']);
            python.stdin.write(JSON.stringify(data));
            python.stdin.end();

            python.stdout.on('data', (data) => {
                console.log(`Python response: ${data}`);
            });
            python.stderr.on('data', (data) => {
                console.error(`Python error: ${data}`);
            });
        }
});


client.initialize();
