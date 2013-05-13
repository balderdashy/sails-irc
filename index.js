/*---------------------------------------------------------------
  :: sails-boilerplate
  -> adapter
---------------------------------------------------------------*/

var async = require('async');
var irc = require('irc');


var adapter = module.exports = {

  // Set to true if this adapter supports (or requires) things like data types, validations, keys, etc.
  // If true, the schema for models using this adapter will be automatically synced when the server starts.
  // Not terribly relevant if not using a non-SQL / non-schema-ed data store
  syncable: false,

  // Keep track of the different configurations
  configurations: {},

  // This method runs when a model is initially registered at server start time
  registerCollection: function(collection, cb) {

    // Require that the host, nick, and channels were specified
    if (!collection.channel) return cb('No channel specified (e.g. #sailsjs');
    if (!collection.nick) return cb('No nick specified (e.g. mikermcneil');
    if (!collection.host) return cb('No host specified (e.g. zelazny.freenode.net');

    // Disable blueprint pubsub
    // collection.silent = true;

    // Connect/join and save reference to configuration
    connect(collection, cb);
  },

  // The following methods are optional
  ////////////////////////////////////////////////////////////

  // Optional hook fired when a model is unregistered, typically at server halt
  // useful for tearing down remaining open connections, etc.
  teardown: function(cb) {
    cb();
  },

  // Send a message to the IRC channel
  create: function (collectionName, options, cb) {
    if (!options.message) return cb('Please create({ message: "your message" }).');

    var client = adapter.configurations[collectionName];
    var activeChannel = adapter.configurations[collectionName]._activeChannel;
    var activeNick = adapter.configurations[collectionName]._activeNick;

    client.say(activeChannel, options.message);
    cb(null, {
      from: activeNick,
      to: activeChannel,
      message: options.message
    });
  },

  // Always return an empty set of messages
  find: function (collectionName, options, cb) {
    cb(null, []);
  }

};

//////////////                 //////////////////////////////////////////
////////////// Private Methods //////////////////////////////////////////
//////////////                 //////////////////////////////////////////

function connect(collection, cb) {
  var client = new irc.Client(collection.host, collection.nick, {
      channels: [collection.channel]
  });

  // If the client encounters an error, wait, then attempt to reconnect
  client.addListener('error', onError);
  function onError (message) {
      sails.log.error("IRCAdapter.onError");
      sails.log.error(message);
      connect(collection);
  }

  // Listen for incoming chats
  client.addListener('message', function (from, to, message) {

    // Fire collection's onCreate method if it exists
    if (collection.publishCreate) {
      collection.publishCreate({
        from: from,
        to: to,
        message: message
      });
    }
  });

  // Save reference to client
  adapter.configurations[collection.identity] = client;

  // Also save reference to active channel and nick
  adapter.configurations[collection.identity]._activeChannel = collection.channel;
  adapter.configurations[collection.identity]._activeNick = collection.nick;

  if (cb) return cb(null, client);
}
