chrome.runtime.onInstalled.addListener(details => {
  console.log(navigator.userAgent)
  // window.llog is not defined now
  // window.llog(navigator.userAgent)
  if (details.reason === 'install') {
    // first install, openHelp()
  }
})

const Messenger = window['ext-messenger']
let messenger = new Messenger()
let events = dush()

messenger.initBackgroundHub({
  connectedHandler: function (extensionPart, connectionName, tabId) {
    console.log('connectedHandler', extensionPart, connectionName, tabId)
    if (tabId) {
      const TAB_READY = `tab:complete:${tabId}`
      const onTabReady = ()=>{
        c.sendMessage(extensionPart + ':' + connectionName + ':' + tabId, {
          type: 'connected'
        }).then(response=>{
          console.log('>>>', response)
        })
      }
      events.once(TAB_READY, onTabReady)
      chrome.tabs.get(tabId, tab=>{
        if(tab.status === 'complete') {
          onTabReady()
        } else {
          events.once(TAB_READY, onTabReady)
        }
      })
    }
  },
  disconnectedHandler: function (extensionPart, connectionName, tabId) {}
})

var c = messenger.initConnection('main', messageHandler)

function messageHandler (message, from, sender, sendResponse) {
  console.log('background - messageHandler()', arguments)
}

// Notify devtool when tab updated (reload, navigation, ...).
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  // console.log('tab onupdated', tabId, changeInfo, tab.status);
  if(changeInfo.status === 'complete') {
    events.emit(`tab:complete:${tabId}`)
  }
})
