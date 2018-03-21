

chrome.devtools.panels.elements
  .createSidebarPane(
    'Stylesheets',
    function (sidebar) {
      function updateElementProperties () {
        var run = ()=>sidebar.setPage('panel.html')
        run()
      }
      updateElementProperties()
      chrome.devtools.panels.elements
        .onSelectionChanged.addListener(updateElementProperties)
    })
