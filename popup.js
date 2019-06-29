
const Messenger = window['ext-messenger'];
let messenger = new Messenger();

let c = messenger.initConnection('main', messageHandler);

function messageHandler(message, from, sender, sendResponse){
    console.log(message, from, sender, sendResponse)
    if(from === 'background:main') {
        switch(message.type) {
            case 'connected':{
                sendResponse('ok, popup')
                break
            }
        }
    }
}

document.querySelector('button').addEventListener('click', e=>{
    c.sendMessage('background:main', {now: Date.now()})
    openWindow()
})

function openWindow(){
    chrome.windows.create({
        url: 'window.html',
        type: 'panel',
        focused: true,
        // setSelfAsOpener: true,
        width: 100,
        left: screen.availWidth - 102
    }, e=>{
        console.log(e)
        // window.close()
    })
}
