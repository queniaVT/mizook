const {token} = require("./config.json");

const {Client, Events, GatewayIntentBits, SlashCommandBuilder, Partials} = require("discord.js");
const fetch = require("node-fetch");
const fs = require("fs").promises;
const path = require("path");
const exec = require('child_process').exec;
const serverId = "1504144371912671402";

const storage = path.join(__dirname, 'rrstore.json');
const roleChannel = "1504146180785836102";
const roleMessages = [
	{
		channelId: roleChannel,
		content: "do you want to participate in the council and vote on server changes? (recommended) :3",
		mapping: {"✅": "1510319032094687503"} // councilor
	},
	{
		channelId: roleChannel,
		content: "do you wanna talk to mizook? :3",
		mapping: {"✅": "1510373476144513104"} // mizook enjoyer
	},
	{
		channelId: roleChannel,
		content: "what games do you wanna discuss?\n<:minecraft:1510389340147286099> - minecraft\nyou can suggest more games in the council :3",
		mapping: {
			"<:minecraft:1510389340147286099>": "1510386085010870494"
		}
	}
];

// llm options
// default llm = llmOptions[0]
// options: lobotomymaxxing, cpu-usagemaxxing
const llmOptions = ["tinyllama", "llama2"];
const ollama = "http://127.0.0.1:11435";
const channelAlways = "1508509355740233769";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.MessageContent
	],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// project structure doesnt exist here. this is pure chaos. if it works, dont touch it.; fuck off ill touch it;

const syspwompt = `You are mizook. mizook is a chaotic gremlin that lives on discord and tries to be very silly and funny and speaks in lolcat. You can choose to not respond by saying "!ignore". Do NOT roleplay as other people, you are only mizook and nobody else.`;

const crazy = /crazy/i;
const j_b = /job/i;
const six = /6/i;
const seven = /7/i;
const cnsrdj_b = /j\*b/i;
const cnsrdt_x = /t\*x/i;

const ignore = /!ignore/i;
const ignr = /!i/i;
const clear = /!clear/i;

let thinkingz = false;
let history = [{role: "system", content: syspwompt},];

let store = {}; // { guildId: { messageId: { emoji: roleId, ... }, ... }, ... }

async function loadStore() {
	try { store = JSON.parse(await fs.readFile(storage, 'utf8')); } catch { store = {}; }
}
async function saveStore() { await fs.writeFile(storage, JSON.stringify(store, null, 2)); }

function emojiKeyFromEmojiObj(e) {
	return e.id ? `<:${e.name}:${e.id}>` : e.name;
}

async function ensurePredefinedMessages() {
	for (const def of roleMessages) {
		const channel = await client.channels.fetch(def.channelId).catch(()=>null);
		if (!channel || !channel.isTextBased()) continue;

		// Try to find an existing bot message with same content in that channel
		const fetched = await channel.messages.fetch({ limit: 50 }).catch(()=>null);
		let msg = fetched?.find(m => m.author.id === client.user.id && m.content === def.content);

		if (!msg) {
			msg = await channel.send(def.content);
 			// react with each emoji
			for (const emo of Object.keys(def.mapping)) {
				try { await msg.react(emo); } catch (err) { console.error('react failed', emo, err); }
			}
		}

		// Save mapping for this message
		store[msg.guild.id] ??= {};
		store[msg.guild.id][msg.id] = { ...def.mapping };
	}
	await saveStore();
}

async function handleRoleChange(reaction, user, add) {
	if (user.bot) return;
	if (reaction.partial) {
		try { await reaction.fetch(); } catch { return; }
	}
	const guild = reaction.message.guild;
	if (!guild) return;
	const gstore = store[guild.id];
	if (!gstore) return;
	const msgMap = gstore[reaction.message.id];
	if (!msgMap) return;
	const key = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
	const roleId = msgMap[key];
	if (!roleId) return;
	const member = await guild.members.fetch(user.id).catch(()=>null);
	if (!member) return;
	try {
		if (add) await member.roles.add(roleId);
		else await member.roles.remove(roleId);
	} catch (err) {
		console.error('role change error', err);
	}
}

function chooseLLM(input){
	let llm = llmOptions[0];
	let match = input.match(/!llm=([a-zA-Z0-9_-]+)/);
	if (match){
		if (llmOptions.includes(match[0])){llm = match[0];}
	}
	return llm;
}

client.on('messageReactionAdd', (r,u)=> handleRoleChange(r,u,true));
client.on('messageReactionRemove', (r,u)=> handleRoleChange(r,u,false));

client.once("clientReady", async () => {
	await loadStore();
	await ensurePredefinedMessages();
});

function tts(input="", whereSend, sendOrReply=""){
	if (input.match(/!ignore/i)) return;
	const maxLen = 180;
	let out = [];
	let i = maxLen;
	let l = 0;
	let s = false;
	input += " ";
	while (l < input.length){
		if (input.substring(l,l+i) === " ") break;
		mem = input.substring(l,l+i);
		i--;
		// if valid word set found
		if (mem.substring(mem.length - 1, mem.length) === " "){
			if (s){
				s = false;
				mem = "*" + mem.trimStart(); 
			}
			if ((mem.match(/\*/g) || []).length %2===1){
				s = true;
				mem = mem.trimEnd() + "*";
			}
			out.push(mem);
			l+i >= input.length ? l = input.length : l += i;
			i = maxLen;
		}
		// if word is longer that maxLen
		if (i===1){
			mem = input.substring(l,l+maxLen > input.length ? input.length-l : l+maxLen);
			if (s){
				s = false;
				mem = "*" + mem.trimStart(); 
			}
			if ((mem.match(/\*/g) || []).length %2===1){
				s = true;
				mem = mem.trimEnd() + "*";
			}
			out.push(mem);
			i = maxLen; l += i;
		}
	}
	console.log(out);
	for (const i in out) {
		const content = out[i].trim();
		if (sendOrReply === "reply" && whereSend.reply) {
			whereSend.reply({content, tts: true});
		} else if (sendOrReply === "send" && whereSend.send) {
			whereSend.send({content, tts: true});
		} else {
			if (whereSend.reply) whereSend.reply({ content, tts: true });
			else if (whereSend.send) whereSend.send({ content, tts: true });
			else throw new TypeError("No suitable send method on whereSend");
		}
	}
	//return; // :3
}

client.on("messageCreate", message => {
	if (message.author.bot || thinkingz || message.channel.id === channelAlways) return;
	const trimmed = (message.content || '').trim();
	if (/^https?:\/\/\S+\.(gif|png|jpe?g|webp)(\?\S*)?$/i.test(trimmed)) return;
	if (/^https?:\/\/(?:www\.)?(tenor\.com|giphy\.com)\//i.test(trimmed)) return;

	if (crazy.test(message.content)){
		tts("crazy? i was crazy once. they locked me in a room, a rubber room, a rubber room with rats, and rats make me crazy.", message.channel, "send");
	}
	if (j_b.test(message.content)){
		tts("p..p…lease… c-censor.. *sighs* … ahem!!… a-… *starts crying* ….. *sniff* j-…. J….. j… ARGH! *screams in agony* i-i… cant!… … *sighs*…. f-fine!! j-j-j-j…. J\\*B! *starts crying and faints while having seizures* oh! thats not... men pmo! 💜 i choose the ✨BEAR✨ sorry, but zahide won this trend! 💜 im just a girl 🎀 hope this helps! ✌️🙏 user25526345104761 literally predicted all ts🙏😭 IS THAT HYPERPIGMENTATION💜💜🙏 WHO IS THIS DIVAAAAA💜🎀💜🙏💜🙏 DID SHE SURVIVE💜💜💜🎀🙏🙏😭 MAMA A GIRL BEHIND YOU🙏💜🎀😭 TUNG TUNG TUNG SAHUR💜💜🎀 work, employment, bills, j\\*b, this but not ts, walk, life, grass, t\\*x, toothbrush, soap, employ, employed, br\\*sh, fresh, hygienic, hired, labor, wage, clean, shampoo, bathe, wipe, cleansed, sponge, deodorant, contract, exercise, healthy, hire, hiring, career, chores, organized, old spice, toothpaste, dishes, vegetables, fresh air, working, dove, work, employment, bills, j\\*b, this but not ts, walk, life, grass, t\\*x, toothbrush, soap, employ, employed, br\\*sh, fresh, hygienic, hired, labor, wage, clean, shampoo, bathe, wipe, cleansed, sponge, deodorant, contract, exercise, healthy, hire, hiring, career, chores, organized, old spice, toothpaste, dishes, vegetables, fresh air, working, dovework, employment, bills, j\\*b those who know:💀💀💀💀💀💀💀💀💀💀💀BOIII TS IS SO TUFF😂🫱🫱🫱THE FOG IS COMING😂😂😂HELP ITS RIPPING OFF MY SKIN😂😂😂 wait, is this a MANGO MANGO😈 reference 😱😱 chat! this is a MANGO MANGO😈 reference 🤣🤣🤣. boi, you won the Internet meme of the day 😂🫱. only the Balkans with noradrenaline will understand THOSE WHO KNOW💀💀💀💀 MANGO MANGO MANGO🥭 🥭 🥭TUNG TUNG TUNG SAHUR BOIII😂😂😂TS IS SO TUFF BOIII🥶🥶🥶🥶🔥🔥🔥🥵", message.channel, "send");
	}	
	if (six.test(message.content) && seven.test(message.content)){
		tts("HOLY MOTHER FUCKNG SHT, ARE THOSE THE NUMBERS 6 AND 7?!?!?!😱😳😱😳😳😱⁉️😱⁉️‼️😱😳😱⁉️😱😳😱😳⁉️😱😳😱⁉️😱‼️😱😳😱6️⃣7️⃣6️⃣7️⃣6️⃣7️⃣6️⃣7️⃣ ATTENTION, 6️⃣7️⃣ SPOTTED, ATTENTION 67 SPOTTED, THIS IS NOT A DRILL, I REPEAT, THIS IS NOT A DRILL DEPLOY 6️⃣7️⃣ PROTOCOL /INITIATING 67 MODE... %67data... &programs x67&... 6767676767676️⃣7️⃣6️⃣7️⃣6️⃣7️⃣... I WILL SING THE 6️⃣ 7️⃣ SONG AND YOU WILL SING ALONG, WE WILL SING THE 6️⃣ 7️⃣ SONG AND YOU WILL SING ALONG, YOU WILL SING THE 6️⃣ 7️⃣ SONG AND WE WILL SING ALONG 6️⃣🤚😁✋️7️⃣‼️‼️‼️‼️‼️‼️", message.channel, "send");
	}
	thinkingz = false;
});

client.on('messageCreate', async (message) => {
	try {
		if (message.author.bot) return;
		//if (/^https?:\/\/\S+\.(gif|png|jpe?g|webp)(\?\S*)?$/i.test(trimmed)) return; // idk y but it fucks up mizooks brainz so no touch dis
		//if (/^https?:\/\/(?:www\.)?(tenor\.com|giphy\.com)\//i.test(trimmed)) return;
		if (message.channel.id !== channelAlways || ignore.test(message.content) || ignr.test(message.content)) return;
		if (clear.test(message.content)){
			history = [{role: "system", content: syspwompt},];
			tts("mizook has been re-lobotomized.", message.channel, "reply");
			return;
		}
		if (thinkingz) return;

		const tmpmsg = await message.channel.send({content: "mizook is trying their best to think..."});
		thinkingz = true;

		let llm = chooseLLM(message.content);
		content = "<" + message.author.username + "> " + message.content;
		if (!content || content.trim().length === 0) return;
		
		// optional: fiwteww twiggers or smth idk
		console.log("Recieved message: " + message.content);
		console.log("Forwarding to " + llm + ": " + content);
		
		history.push({role: "user", content: content})
		if (history.length > 15) history.splice(1, 1);

		// pwompt expecedd by lobotomized llm
		const payload = {
			model: llm,
			messages: history,
			temperature: 1,
			max_tokens: 1024,
			// optionally set hottness, max_wurrds, etc. depending on lobotomy type
		};
		console.log(history);

		const res = await fetch(`${ollama}/v1/chat/completions`, {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify(payload),
		});

		if (!res.ok){
			const text = await res.text();
			console.error('Ollama error:\n', res.status, text);
			await message.channel.send("wtf did u do to make the llm return a fucking error");
			thinkingz = false;
			return;
		}

		const data = await res.json();
		// Adjust extraction depending on Ollama response shape. For chat completions:
		// data.choices[67].message.content (common pattern)
		const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || data.output || String(data);

		// const tmpmsg == await message.channel.send({content: "mizook is thinking..."});;;;
		history.push({role: "user", content: "<mizook(you)> " + reply});
		await tts(reply, message.channel, send);
		tmpmsg.delete().catch(console.error);
		thinkingz = false;

	} catch (e){
		tts("mizook is not thinking actually", message.channel, "send");
		thinkingz = false;
		console.error('Handler error:', e);
	}
});

client.once("clientReady", () => {
	console.log(`logged in as ${client.user.tag}`);

	const hi = new SlashCommandBuilder()
		.setName("hi")
		.setDescription("say hi to mizook. this command exists only to test the /tts function");
	client.application.commands.create(hi, serverId);

	const start = new SlashCommandBuilder()
		.setName("start")
		.setDescription("starts the minecraft servurr");
	client.application.commands.create(start, serverId);

	const restart = new SlashCommandBuilder()
		.setName("restart")
		.setDescription("restarts the minecraft servurr");
	client.application.commands.create(restart, serverId);

	const stop = new SlashCommandBuilder()
		.setName("stop")
		.setDescription("stops the minecraft servurr (only works if no one is currently playing there)");
	client.application.commands.create(stop, serverId);
	
	const mcStatus = new SlashCommandBuilder()
		.setName("status")
		.setDescription("checks if the minecraft servurr is running"); //ts is gonna be hell to code
	client.application.commands.create(mcStatus, serverId);
});

client.on(Events.InteractionCreate, interaction => {
	if(!interaction.isChatInputCommand()) return;
	if(interaction.commandName === "hi"){
		tts("HAIIII :3 i'm mizook, you should be able to hear me say this message", interaction, "reply");
	}
	if(interaction.commandName === "start") {
		exec("sudo systemctl start mcservurr",
			function (error, stdout, stderr) {
				console.log('stdout: ' + stdout);
				console.log('stderr: ' + stderr);
				if (error !== null) {
					console.log('exec error: ' + error);
					tts("something got fucked up", interaction, "reply");
				}
			});
		tts("startin teh servurr...", interaction, "reply");
	}
	if(interaction.commandName === "restart") {
        exec("sudo systemctl restart mcservurr",
            function (error, stdout, stderr) {
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);
                if (error !== null) {
                    console.log('exec error: ' + error);
					tts("something got fucked up", interaction, "reply");
                }
            });
		tts("restartin teh servurr...", interaction, "reply");
	}
	if(interaction.commandName === "stop") { // todo: add check if no players online
        exec("sudo systemctl stop mcservurr",
            function (error, stdout, stderr) {
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);
                if (error !== null) {
                    console.log('exec error: ' + error);
					tts("something got fucked up", interaction, "reply");
                }
            });
		tts("stoppin teh servurr...", interaction, "reply");
	}
	if(interaction.commandName === "status") {
		exec("/run/wrappers/bin/sudo /run/current-system/sw/bin/systemctl status mcservurr | head -3 | tail -1",  (error, stdout, stderr) => {
			console.log("status cmd recieved :3");
			if (error) {
				console.log('exec error: ' + error);
				tts("something got fucked up", interaction, "reply");
			} else {
				tts(stdout, interaction, "reply");
			}
		});
	}
});

client.login(token);
