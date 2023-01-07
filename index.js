require('dotenv').config()

const { Client, Intents, GatewayIntentBits, REST, Routes } = require('discord.js');
const discord = require('discord.js');
const fs = require('fs');

const { COMMAND_PREFIX } = require("./config/config.json");
const DEPOSIT_TIERS = require("./resources/deposit-tiers.json");
const completedOrders = require('./jobs/completed-orders');
const { isCommandAllowed } = require('./util/permissions');
const { logCommandUsage, getAllOrders, getInfoMessages, getPaymentInfo, getPaymentMethods, getPaymentAddresses } = require("./util/common.js")
const BotResponse = require('./util/response');
const { refresh } = require('./jobs/refresh-stats');
const { update } = require('./jobs/completed-orders');
const refreshStats = require('./jobs/refresh-stats');
const OFFERINGS = require('./resources/offerings.json');
const { refreshPrices } = require('./jobs/refresh-price-list');
const refreshPriceList = require('./jobs/refresh-price-list');
const config = require('./resources/config');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const newCommands = [];
let commandsOnCooldown = [];

client.on("ready", async () => {
	client.user.setActivity("try .help", {type: ""}) 

	const commandDirectory = fs.readdirSync('./commands');
	client.commands = new discord.Collection();

    for (const item of commandDirectory) {
		const itemInfo = fs.lstatSync(`./commands/${item}`);

		// check if the item found is a directory
		if (itemInfo.isDirectory()) {
			const subDirectory = fs.readdirSync(`./commands/${item}`).filter(name => name.includes(".js") && name !== `${item}.js`);

			for (const subItem of subDirectory) {
				const command = require(`./commands/${item}/${subItem}`);
				client.commands.set(command.name, command);

				// if this is a new command and not a button/modal etc, add to slash commands
				if (command.type === "new" && command.scope === "command") {
					newCommands.push(command.data.toJSON());
				}

				console.log(`Loaded command ${command.name}`);
			}

		// the item is a command
		} else {
			const command = require(`./commands/${item}`);
			client.commands.set(command.name, command);

			// if this is a new command and not a button/modal etc, add to slash commands
			if (command.type === "new" && command.scope === "command") {
				newCommands.push(command.data.toJSON());
			}

			console.log(`Loaded command ${command.name}`);
		}
	}

	completedOrders.update(client);
	refreshStats.refresh(client);
	refreshPriceList.refreshPrices(client);

	// load new commands to discord
	console.log(`Started refreshing ${newCommands.length} application (/) commands.`);
	const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);		

	const data = await rest.put(
		Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
		{ body: newCommands },
	);

	console.log(`Successfully reloaded ${data.length} application (/) commands.`);

	console.log("Ready!");
});

// handle new commands
client.on('interactionCreate', async interaction => {
	console.log(`Received interaction from ${interaction.user.tag}: ${interaction.commandName ?? interaction.customId} | autocomplete: ${interaction.isAutocomplete()}`);
	let cfg = new config();
    let commandName;

    // chat input command
	if (interaction.isChatInputCommand()) {
        commandName = interaction.commandName;

    // button or modal
    } else if (interaction.isButton() || interaction.isModalSubmit()) {
        commandName = interaction.customId;

	// dropdown
	} else if (interaction.isSelectMenu()) {
			commandName = interaction.customId;

    // auto complete
    } else if (interaction.isAutocomplete()) {
		const field = interaction.options.getFocused(true);
		let choices = [];
        interaction.respond([...choices]);
    }

	const command = interaction.client.commands.get(commandName);
	if (!command) return;

    if (commandsOnCooldown.includes(commandName)) {
        interaction.reply({ content: "This command is on cooldown, you can only use it once every 15 minutes", ephemeral: true });
        return;
    }

	try {
        // if the command requires cooldown, add it to the array
        // if (command.requiresCooldown) {
        //     commandsOnCooldown.push(command.name);
        //     setTimeout(() => {
        //         const index = commandsOnCooldown.indexOf(command.name);
        //         if (index > -1) {
        //             commandsOnCooldown.splice(index, 1);
        //         }
        //     }, 15*60*1000) // cooldown for 10 mins in MS
        // }

        // execute the command
		if (!command.blockDefer) {
			await interaction.deferReply({ephemeral: command.ephemeral});
		}
		await command.execute(interaction);

	} catch (error) {
		console.error(error);
		await interaction.editReply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});






// jobs
// setInterval(function() {refresh(client);}, 3600000);
setInterval(function() {update(client);}, 3600000);
setInterval(function() {console.log("Still alive");}, 60000);
client.login(process.env.BOT_TOKEN);