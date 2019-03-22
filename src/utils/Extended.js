const EventEmitter = require("events").EventEmitter;

class MessageCollector extends EventEmitter {
    constructor(channel, filter, options = {}) {
        super();
        this.filter = filter;
        this.channel = channel;
        this.options = options;
        this.ended = false;
        this.collected = [];
        this.bot = channel.guild ? channel.guild.shard.client : channel._client;

        this.listener = (message) => this.verify(message);
        this.bot.on("messageCreate", this.listener);
        if (options.time) setTimeout(() => this.stop("time"), options.time);
    }

    verify(message) {
        if (this.channel.id !== message.channel.id) return false;
        if (this.filter(message)) {
            this.collected.push(message);

            this.emit("message", message);
            if (this.collected.length >= this.options.maxMatches) this.stop("maxMatches");
            return true;
        }
        return false;
    }

    stop(reason) {
        if (this.ended) return;
        this.ended = true;
        this.bot.removeListener("messageCreate", this.listener);

        this.emit("end", this.collected, reason);
    }
}

module.exports = (Eris) => {
    Eris.Channel.prototype.awaitMessages = function (filter, options) {
        const collector = new MessageCollector(this, filter, options);
        return new Promise((resolve) => collector.on("end", resolve));
    };

    Reflect.defineProperty(Eris.User.prototype, "tag", {
        get: function() {
            return `${this.username}#${this.discriminator}`;
        }
    });

    Reflect.defineProperty(Eris.Member.prototype, "tag", {
        get: function() {
            return `${this.username}#${this.discriminator}`;
        }
    });
};