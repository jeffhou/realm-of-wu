const pug = require('pug')
const compiledView_Main = pug.compileFile('templates/basic-template.pug');
const compiledView_Inventory = pug.compileFile('templates/inventory.pug');
const compiledView_Combat = pug.compileFile('templates/combat.pug');

const express = require('express')
const app = express()

function User(name) {
  this.level = 1;
  this.experience = 0;
  this.name = name;
  this.inventory = {'pizza slices': 5, 'empty pizza boxes': 3}
  this.money = 0
  this.hp_current = 100
  this.hp_max = 10
}

function Monster(name) {
  this.name = name;
  this.image = "https://s3.amazonaws.com/images.kingdomofloathing.com/adventureimages/dwarf_dopey.gif"
  this.inventory = [{"name": 'unopened pizza box', "quantity": 1, "chance": 0.5}]
  this.money = 5
  this.hp_current = 2
  this.hp_max = 3
  this.level = 1
}

var user = new User('u9q5')
var combatStatus = "new combat"
var monster = null
app.use('/css', express.static('templates/css'))

app.get('/', function (request, response) {
  response.send(compiledView_Main({user: user}))
})

app.get('/inventory', function (request, response) {
  response.send(compiledView_Inventory({user: user}))
})

app.get('/combat', function (request, response) {
  if (monster == null) {
    monster = new Monster("dopey 7-Foot Dwarf")
  }
  var userAttackAmt = user.level
  var userAttackStr = "You \"pew pew pew\"ed the monster for " + userAttackAmt + " damage!"
  monster.hp_current -= userAttackAmt

  if (monster.hp_current <= 0) {
    response.send(compiledView_Combat(
      {
        user: user,
        monster: monster,
        userAttackText: userAttackStr,
        battleConsequences: {
          'items': ['unopened pizza box', 'chocolate'],
          'exp': 10,
          'money': monster.money
        }
      }
    ))
    monster = null

    if (!('unopened pizza box' in user.inventory)) {
      user.inventory['unopened pizza box'] = 1
    } else if ('unopened pizza box' in user.inventory) {
      user.inventory['unopened pizza box'] += 1
    }

  } else if (monster.hp_current > 0) {
    var monsterAttackAmt = monster.level
    var monsterAttackStr = "The monster hit you for " + monsterAttackAmt + " damage."
    user.hp_current -= monsterAttackAmt
    if (user.hp_current > 0) {
      response.send(compiledView_Combat(
        {
          user: user,
          monster: monster,
          userAttackText: userAttackStr,
          monsterAttackText: monsterAttackStr
        }
      ))
    } else if (user.hp_current <= 0) {
      user.hp_current = 0
      response.send(compiledView_Combat(
        {
          user: user,
          monster: monster,
          userAttackText: userAttackStr,
          monsterAttackText: monsterAttackStr,
          battleEndText: "You lost the fight!"
        }
      ))
    }
  }

})

app.listen(3000, function () {
})
