const pug = require('pug')
const compiledView_Inventory = pug.compileFile('templates/inventory.pug');
const compiledView_Combat = pug.compileFile('templates/combat.pug');

const express = require('express')
const app = express()

function User(name) {
  this.level = 1;
  this.experience = 0;
  this.name = name;
  this.inventory = {}
  this.money = 0
  this.hp_current = 10
  this.hp_max = 10
}
User.prototype.attackDamage = function () {
  return this.level
}
User.prototype.attackMsg = function (attackDamage) {
  return "You \"pew pew pew\"ed the monster for " + attackDamage + " damage!"
}
User.prototype.gainExp = function (amt) {
  this.experience += amt
  console.log("user gains " + amt + " exp, total - " + this.experience)
  if (this.experience >= this.level * this.level * this.level) {
    this.level += 1
    console.log("user levels up to level " + this.level)
    return 1
  }
  return 0
}

var nextItemID = 0
var items = []
var itemsDict = {}
function Item (name) {
  this.id = nextItemID
  nextItemID += 1

  this.name = name
  items.push(this)
  itemsDict[name] = this
}
new Item("spider web")
new Item("moxie weed")

var nextMonsterID = 0
var monsters = []
function Monster(name, inventory, hp, attack, money, exp, imageURL) {
  this.id = nextMonsterID
  nextMonsterID += 1
  monsters.push(this)

  this.name = name;
  this.imageURL = imageURL
  this.inventory = inventory
  this.hp = hp
  this.attack = attack
  this.money = money
  this.exp = exp
}
Monster.prototype.create = function () {
  return {"monster": this, "currentHP": this.hp}
}
new Monster("big creepy spider", [0, 0], 2, 1, 1, 1, "http://cdn.coldfront.net/thekolwiki/images/9/9a/Spider1.gif")
new Monster("drunken half-orc hobo", [1], 3, 2, 2, 3, "http://cdn.coldfront.net/thekolwiki/images/d/d5/Hobo.gif")

var user = new User('u9q5')
var combatStatus = "new combat"
var monster = null
app.use('/css', express.static('templates/css'))

app.get('/', function (request, response) {
  response.send(compiledView_Inventory({user: user, itemStrings: compileInventoryStrings()}))
})

function compileInventoryStrings () {
  itemStrings = []
  for (var key in user.inventory) {
    console.log("inventory - key:" + key)
    console.log("inventory - item name:" + items[key].name)
    console.log("inventory - value:" + user.inventory[key])
    itemStrings.push(items[key].name + " - " + user.inventory[key])
  }
  return itemStrings
}

app.get('/inventory', function (request, response) {
  response.send(compiledView_Inventory({user: user, itemStrings: compileInventoryStrings()}))
})

function generateMonsterForCombat () {
  monsterIndex = Math.floor(Math.random() * monsters.length)
  monster = monsters[monsterIndex].create()
  return monster
}

app.get('/combat', function (request, response) {
  console.log("user enters combat, userHP - " + user.hp_current)
  // No monster currently.
  if (monster == null) {
    monster = generateMonsterForCombat()
    console.log("monster " + monster["monster"].name + " created, currentHP - " + monster['currentHP'])
  }
  monster['currentHP'] -= user.attackDamage()
  console.log("monster damaged, currentHP - " + monster['currentHP'] + " damage - " + user.attackDamage())

  // Monster died.
  if (monster['currentHP'] <= 0) {
    console.log("monster died")
    var itemAcquiredStrings = []
    for (var i = 0; i < monster['monster'].inventory.length; i++) {
      if (!(monster['monster'].inventory[i] in user.inventory)) {
        user.inventory[monster['monster'].inventory[i]] = 1
      } else if (monster['monster'].inventory[i] in user.inventory) {
        user.inventory[monster['monster'].inventory[i]] += 1
      }
      itemAcquiredStrings.push(items[monster['monster'].inventory[i]].name)
      console.log("user acquires item: " + items[monster['monster'].inventory[i]].name)
    }
    user.money += monster['monster'].money
    console.log("user gains " + monster['monster'].money + " gold, total - " + user.money)
    user.gainExp(monster['monster'].exp)
    response.send(compiledView_Combat(
      {
        user: user,
        monster: monster['monster'],
        userAttackText: user.attackMsg(user.attackDamage()),
        battleConsequences: {
          'items': itemAcquiredStrings,
          'exp': monster['monster'].exp,
          'money': monster['monster'].money
        }
      }
    ))
    monster = null

  // Monster survived.
  } else if (monster['currentHP'] > 0) {
    console.log("monster survived")
    var monsterAttackAmt = monster["monster"].attack
    var monsterAttackStr = "The monster hit you for " + monsterAttackAmt + " damage."
    user.hp_current -= monsterAttackAmt
    console.log("user damaged, currentHP - " + user.hp_current + " damage - " + monsterAttackAmt)
    if (user.hp_current > 0) {
      console.log("user survived")
      response.send(compiledView_Combat(
        {
          user: user,
          monster: monster["monster"],
          userAttackText: user.attackMsg(user.attackDamage()),
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
