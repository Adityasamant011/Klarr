// Google Apps Script - Deploy as Web App
// This receives form submissions from Klarr and emails them to klarr.space@gmail.com

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  
  var subject = '🔔 New Klarr Lead: ' + data.name;
  var body = 'New lead from Klarr profit breakdown tool\n\n' +
    'Name: ' + data.name + '\n' +
    'Email: ' + data.email + '\n' +
    'Store: ' + data.store + '\n' +
    'Revenue: ' + data.revenue + '\n' +
    'Ad Spend: ' + data.adSpend + '\n' +
    'Time: ' + new Date().toISOString();
  
  MailApp.sendEmail({
    to: 'klarr.space@gmail.com',
    subject: subject,
    body: body
  });
  
  return ContentService.createTextOutput(JSON.stringify({success: true}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput('Klarr webhook is running')
    .setMimeType(ContentService.MimeType.TEXT);
}
