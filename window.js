const Messenger = window['ext-messenger'];
let messenger = new Messenger();

let c = messenger.initConnection('win', messageHandler);

function messageHandler(message, from, sender, sendResponse){
    console.log(message, from, sender, sendResponse)
    if(from === 'background:main') {
        switch(message.type) {
            case 'connected':{
                sendResponse('ok, win')
                break
            }
        }
    }
}

// c.sendMessage('background:main', {now: Date.now()})

