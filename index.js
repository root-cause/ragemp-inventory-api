const EventEmitter = require("events");
const isEqual = require("lodash.isequal");

class InventoryScript extends EventEmitter {
    constructor() {
        super();
        this._items = {};
    }

    /**
     * Adds an item to the inventory system.
     * @param {string} key         Item identifier, such as "item_medkit".
     * @param {string} name        Item name, such as "Medkit".
     * @param {string} description Item description, such as "Gives you 10 health".
     * @param {function} [onUse]   Optional - Function that gets called when the item is used.
     * @param {function} [nameFunc] Optional - Function that gets called when getItemName() is used.
     * @param {function} [descFunc] Optional - Function that gets called when getItemDescription() is used.
     * @return {object} The added item, will be null if there are any mistakes.
     * @fires itemDefined
     */
    addItem(key, name, description, onUse, nameFunc, descFunc) {
        if (typeof key !== "string" || key.length < 1) {
            console.error("addItem: Key was not a string/was an empty string.");
            return null;
        } else if (typeof name !== "string" || name.length < 1) {
            console.error(`addItem: Name was not a string/was an empty string. (${key})`);
            return null;
        } else if (typeof description !== "string") {
            console.error(`addItem: Description was not a string. (${key})`);
            return null;
        } else if (this._items.hasOwnProperty(key)) {
            console.error(`addItem: Item (${key}) already exists.`);
            return null;
        }

        this._items[key] = {
            name: name,
            description: description,
            onUse: onUse,
            nameFunc: nameFunc,
            descFunc: descFunc
        };

        this.emit("itemDefined", key, name, description);
        return this._items[key];
    }

    /**
     * Returns whether the specified key is a registered or not.
     * @param  {string}  key Item identifier, such as "item_medkit".
     * @return {Boolean}     True if registered, false otherwise.
     */
    hasItem(key) {
        return this._items.hasOwnProperty(key);
    }

    /**
     * Returns the specified item.
     * @param  {string} key Item identifier, such as "item_medkit".
     * @return {object}     The item at the specified key, will be undefined if the key isn't registered.
     */
    getItem(key) {
        return this._items[key];
    }

    /**
     * Returns all registered item identifiers.
     * @return {string[]} An array of registered item identifiers.
     */
    getAllItems() {
        return Object.keys(this._items);
    }

    /**
     * Returns the human readable name of the specified item.
     * @param  {string} key Item identifier, such as "item_medkit".
     * @param  {string} [data] Optional - An object that has item attributes.
     * @return {string}     Human readable item name.
     */
    getItemName(key, data) {
        return this.hasItem(key) ? (typeof this._items[key].nameFunc === "function" ? this._items[key].nameFunc(data) : this._items[key].name) : "Invalid Item";
    }

    /**
     * Returns the description of the specified item.
     * @param  {string} key Item identifier, such as "item_medkit".
     * @param  {string} [data] Optional - An object that has item attributes.
     * @return {string}     Item's description.
     */
    getItemDescription(key, data) {
        return this.hasItem(key) ? (typeof this._items[key].descFunc === "function" ? this._items[key].descFunc(data) : this._items[key].description) : "";
    }
}

const inventoryScript = new InventoryScript();

// Player functions
/**
 * Returns the inventory array of the player.
 * @return {object[]} An array that holds all items of the player.
 */
mp.Player.prototype.getInventory = function() {
    return this._inventory;
};

/**
 * Replaces the inventory array of the player with the specified one.
 * @param {Array} newInventory An array that's going to be the new inventory of the player.
 * @return {Boolean} True if successful, false otherwise.
 * @fires inventoryReplaced
 */
mp.Player.prototype.setInventory = function(newInventory) {
    if (Array.isArray(newInventory)) {
        const oldInventory = this._inventory;
        this._inventory = newInventory;

        inventoryScript.emit("inventoryReplaced", this, oldInventory, newInventory);
        return true;
    } else {
        return false;
    }
};

/**
 * Returns whether the player has the specified item or not.
 * @param  {string}  itemKey Item identifier.
 * @return {Boolean}         True if player has the item, false otherwise.
 */
mp.Player.prototype.hasItem = function(itemKey) {
    return this._inventory.findIndex(i => i.key === itemKey) !== -1;
};

/**
 * Same as hasItem but for items with custom attributes.
 * @param  {string}  itemKey Item identifier.
 * @param  {object}  data    An object that has item attributes.
 * @return {Boolean}         True if player has the item, false otherwise.
 */
mp.Player.prototype.hasItemWithData = function(itemKey, data) {
    return this._inventory.findIndex(i => i.key === itemKey && isEqual(i.data, data)) !== -1;
};

/**
 * Gets the item's index in the player's inventory.
 * @param  {string} itemKey Item identifier.
 * @return {number}         Index of the item, -1 if not found.
 */
mp.Player.prototype.getItemIndex = function(itemKey) {
    return this._inventory.findIndex(i => i.key === itemKey);
};

/**
 * Same as getItemIndex but for items with custom attributes.
 * @param  {string} itemKey Item identifier.
 * @param  {object} data    An object that has item attributes.
 * @return {number}         Index of the item, -1 if not found.
 */
mp.Player.prototype.getItemIndexWithData = function(itemKey, data) {
    return this._inventory.findIndex(i => i.key === itemKey && isEqual(i.data, data));
};

/**
 * Gets how many of the specified item exists in the player's inventory.
 * @param  {string} itemKey Item identifier.
 * @return {number}         Item amount.
 */
mp.Player.prototype.getItemAmount = function(itemKey) {
    return this._inventory.reduce((total, item) => {
        return total + (item.key === itemKey ? item.amount : 0);
    }, 0);
};

/**
 * Same as getItemAmount but for items with custom attributes.
 * @param  {string} itemKey Item identifier.
 * @param  {object} data    An object that has item attributes.
 * @return {number}         Item amount.
 */
mp.Player.prototype.getItemAmountWithData = function(itemKey, data) {
    return this._inventory.reduce((total, item) => {
        return total + (item.key === itemKey && isEqual(item.data, data) ? item.amount : 0);
    }, 0);
};

/**
 * Gets total amount of items the player has in their inventory.
 * @return {number} Amount of all items.
 */
mp.Player.prototype.getTotalItemAmount = function() {
    return this._inventory.reduce((total, item) => {
        return total + item.amount;
    }, 0);
};

/**
 * Gives the specified item to the player.
 * @param  {string} itemKey Item identifier.
 * @param  {number} amount  Amount to give.
 * @param  {object} [data]    Optional - An object that has item attributes.
 * @return {Boolean}         True if successful, false otherwise.
 * @fires itemAdded
 */
mp.Player.prototype.giveItem = function(itemKey, amount, data) {
    if (inventoryScript.hasItem(itemKey) && Number.isInteger(amount) && amount > 0) {
        const itemIdx = this.getItemIndexWithData(itemKey, data);

        if (itemIdx !== -1) {
            this._inventory[itemIdx].amount += amount;
        } else {
            this._inventory.push({
                key: itemKey,
                amount: amount,
                data: data
            });
        }

        inventoryScript.emit("itemAdded", this, itemKey, amount, data);
        return true;
    } else {
        return false;
    }
};

/**
 * Uses the item at the specified index of the player's inventory array.
 * @param  {number} itemIdx Index of the item in player's inventory array.
 * @return {Boolean}         True if successful, false otherwise.
 * @fires itemUsed
 */
mp.Player.prototype.useItem = function(itemIdx) {
    if (Number.isInteger(itemIdx) && this._inventory[itemIdx]) {
        const item = this._inventory[itemIdx];
        const itemDef = inventoryScript.getItem(item.key);
        if (itemDef && typeof itemDef.onUse === "function") itemDef.onUse(this, itemIdx, item.key, item.data);

        inventoryScript.emit("itemUsed", this, itemIdx, item.key, item.data);
        return true;
    } else {
        return false;
    }
};

/**
 * Removes the item at the specified index of the player's inventory array.
 * @param  {number} itemIdx Index of the item in player's inventory array.
 * @param  {number} [amount]  Optional - Amount to remove.
 * @return {Boolean}         True if successful, false otherwise.
 * @fires itemRemoved
 * @fires itemRemovedCompletely
 */
mp.Player.prototype.removeItem = function(itemIdx, amount = 1) {
    if (Number.isInteger(itemIdx) && this._inventory[itemIdx] && Number.isInteger(amount) && amount > 0) {
        const item = this._inventory[itemIdx];
        this._inventory[itemIdx].amount -= amount;
        inventoryScript.emit("itemRemoved", this, itemIdx, item.key, amount, item.data);

        if (this._inventory[itemIdx].amount < 1) {
            this._inventory.splice(itemIdx, 1);
            inventoryScript.emit("itemRemovedCompletely", this, item.key, item.data);
        }

        return true;
    } else {
        return false;
    }
};

// RAGEMP Events
mp.events.add("playerJoin", (player) => {
    player._inventory = [];
});

module.exports = inventoryScript;