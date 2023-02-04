# node-bing-translate

## 安装

```
yarn add node-bing-translate
```

## 使用

```
const translate = require('node-bing-translate')

translate.speech('床前明月光，疑是地上霜。举头望明月，低头思故乡。').then(res => {
  list.push({ text: '床前明月光，疑是地上霜。举头望明月，低头思故乡。', src: res })
  fs.writeFileSync(join(__dirname, 'list.json'), "var list = " + JSON.stringify(list))
})

translate.translate('床前明月光，疑是地上霜。举头望明月，低头思故乡。').then(res => {
  //{
  //  source: '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
  //  text: 'The moonlight in front of the bed is suspected to be frost on the ground. Raise your head to look at the moon, bow your head and think of your hometown.',
  //  to: 'en',
  //  language: 'zh-Hans',
  //  inputTransliteration: 'chuáng qián míng yuè guāng ， yí shì de shàng shuāng 。 jǔ tóu wàng míng yuè ， dī tóu sī gù xiāng 。'
  //}
  console.log(res);
})
```
