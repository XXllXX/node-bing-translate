const tr = require('../index')
const fs = require('fs')
const { join } = require('path')

let list = []


tr.speech('小米').then(res => {
  list.push({ text: '小米', src: res })
  fs.writeFileSync(join(__dirname, 'list.json'), "var list = " + JSON.stringify(list))
})
  .catch(error => {
    console.log(error);
  })

tr.speech('床前明月光，疑是地上霜。举头望明月，低头思故乡。').then(res => {
  list.push({ text: '床前明月光，疑是地上霜。举头望明月，低头思故乡。', src: res })
  fs.writeFileSync(join(__dirname, 'list.json'), "var list = " + JSON.stringify(list))
})

tr.translate('床前明月光，疑是地上霜。举头望明月，低头思故乡。').then(res => {
  console.log(res);
})