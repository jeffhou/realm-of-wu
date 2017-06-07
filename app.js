const pug = require('pug')
const compiledTemplate = pug.compileFile('templates/index.pug');
const compiledTemplate2 = pug.compileFile('templates/basic-template.pug');

const express = require('express')
const app = express()

app.use('/css', express.static('templates/css'))

app.get('/', function (request, response) {
  response.send(compiledTemplate({name: 'Jeff'}))
})

app.get('/test', function (request, response) {
  response.send(compiledTemplate2({name: 'Jeff'}))
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
