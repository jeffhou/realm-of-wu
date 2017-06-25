const pug = require('pug')
const compiledView_Inventory = pug.compileFile('templates/inventory.pug');
const compiledView_Combat = pug.compileFile('templates/combat.pug');
const compiledView_Map_Location = pug.compileFile('templates/map-location.pug');

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

var nextLocationID = 0
var locations = []
function ImageLocation (imageURL) {
  this.type = "ImageLocation"
  this.location = new Location(imageURL)
  this.location.parent = this
}
function MapLocation (imageURL, map) {
  this.type = "MapLocation"
  this.map = map
  this.location = new Location(imageURL)
  this.location.parent = this
}
function AdventureLocation (imageURL, name, adventures) {
  this.type = "AdventureLocation"
  this.adventures = adventures
  this.name = name
  this.location = new Location(imageURL)
  this.location.parent = this
}
function Location (imageURL) {
  this.id = nextLocationID
  nextLocationID += 1
  locations.push(this)

  this.imageURL = imageURL
}
new MapLocation("http://cdn.coldfront.net/thekolwiki/images/5/59/Rubble2.gif", [[1, 2], [3, 4]])
new AdventureLocation("http://cdn.coldfront.net/thekolwiki/images/2/2e/Alley.gif", "The Sleazy Back Alley", [{"id":0, "odds":1}, {"id":1, "odds":1}]) //TODO: Odds not currently implemented.
new ImageLocation("http://cdn.coldfront.net/thekolwiki/images/5/59/Rubble2.gif")
new ImageLocation("http://cdn.coldfront.net/thekolwiki/images/5/59/Rubble2.gif")
new ImageLocation("http://cdn.coldfront.net/thekolwiki/images/5/59/Rubble2.gif")


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
function Monster (name, inventory, hp, attack, money, exp, imageURL) {
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
new Monster("big creepy spider", [{"id":0, "chance":0.25, "quantity": 2}], 2, 1, 1, 1, "http://cdn.coldfront.net/thekolwiki/images/9/9a/Spider1.gif")
new Monster("drunken half-orc hobo", [{"id":1, "chance":0.33, "quantity": 1}], 3, 2, 2, 3, "http://cdn.coldfront.net/thekolwiki/images/d/d5/Hobo.gif")

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
app.get('/map', function (request, response) { // TODO: after battle, should be able to go back to parent location after combat -> only possible if each location has a parent value
  if(request.query.locationID == undefined) {
    request.query.locationID = 0
  }
  var location = locations[request.query.locationID];
  if (location.parent instanceof MapLocation) {
    var imageMap = []
    for (var i = 0; i < location.parent.map.length; i++) {
      imageMap.push([])
      for (var j = 0; j < location.parent.map[i].length; j++) {
        var currentLocationID = location.parent.map[i][j]
        imageMap[i].push({id: currentLocationID, image: locations[currentLocationID].imageURL, type: locations[currentLocationID].parent.type})
      }
    }
    response.send(compiledView_Map_Location({user: user, imageMap: imageMap}))
  } else if (location.parent instanceof AdventureLocation) {
    console.log("user enters combat, userHP - " + user.hp_current)
    // No monster currently.
    if (monster == null) {
      monster = generateMonsterForCombat(location)
      console.log("monster " + monster["monster"].name + " created, currentHP - " + monster['currentHP'])
    }
    monster['currentHP'] -= user.attackDamage()
    console.log("monster damaged, currentHP - " + monster['currentHP'] + " damage - " + user.attackDamage())

    // Monster died.
    if (monster['currentHP'] <= 0) {
      console.log("monster died")
      var itemAcquiredStrings = []
      var drops = generateMonsterDrops(monster['monster'])
      for (var i in drops) {
        if (!(i in user.inventory)) {
          user.inventory[i] = drops[i]
        } else if (i in user.inventory) {
          user.inventory[i] += drops[i]
        }
        for (var j = 0; j < drops[i]; j++) {
            itemAcquiredStrings.push(items[i].name)
        }
        console.log("user acquires item: " + items[i].name)
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
          },
          locationID: request.query.locationID
        }
      ))
      monster = null
      // TODO: user at 0 hp scenario
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
            monsterAttackText: monsterAttackStr,
            locationID: request.query.locationID
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
            battleEndText: "You lost the fight!",
            locationID: request.query.locationID
          }
        ))
      }
    }
  }

})

function generateMonsterForCombat (location) {
  monsterIndex = location.parent.adventures[Math.floor(Math.random() * location.parent.adventures.length)]["id"]
  monster = monsters[monsterIndex].create()
  return monster
}

// Return array of item maps (keys: id, quantity)
function generateMonsterDrops (monster) {
  drops = {}
  inventory = monster.inventory
  for (var i = 0; i < inventory.length; i++) {
    for (var j = 0; j < inventory[i]["quantity"]; j++) {
      if (Math.random() < inventory[i]["chance"]) {
        if (inventory[i]["id"] in drops) {
          drops[inventory[i]["id"]] += 1
        } else if (!(inventory[i]["id"] in drops)) {
          drops[inventory[i]["id"]] = 1
        }
      }
    }
  }
  return drops
}

app.listen(3000, function () {
})
