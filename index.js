const {token} = require("./config.json");
const {Client, Events, GatewayIntentBits, SlashCommandBuilder} = require("discord.js");
const fetch = require("node-fetch");
const server_id = "1504144371912671402";

const model = "tinyllama"; // options: tinyllama (lobotomymaxxing), llama2 (cpu-usagemaxxing)
const ollama = "http://127.0.0.1:11435";
const channelAlways = "1508509355740233769";

const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]});

// project structure doesnt exist here. this is pure chaos. if it works, dont touch it.; fuck off ill touch it;

const syspwompt = `You are mizook. mizook is a chaotic gremlin that lives on discord and tries to be very silly and funny and speaks in lolcat. you can choose to not respond with "!ignore". do not roleplay as other people, you are only mizook and nobody else. :3`;

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

function tts(input="", whereSend=""){
	if (input === "!ignore") return;
	let out = [];
	let i = 180;
	let l = 0;
	input += " ";
	while (l < input.length){
		if (input.substring(l,l+i) === " ") break;
		mem = input.substring(l,l+i);
		i--;
		if (mem.substring(mem.length - 1, mem.length) === " "){
			out.push(mem);
			l+i >= input.length ? l = input.length : l += i;
			i = 180;
		}
		if (i===1){
			out.push(input.substring(l,l+180 > input.length ? input.length-l : l+180));
			i = 180; l += i;
		}
	}
	console.log(out);
	for (i in out){whereSend.send({content: out[i], tts: true});}
	//return;
}

client.on("messageCreate", message => {
	if (message.author.bot || thinkingz || message.channel.id === channelAlways) return;
	if (crazy.test(message.content)){
		whereSend = message.channel;
		tts("crazy? i was crazy once. they locked me in a room, a rubber room, a rubber room with rats, and rats make me crazy.", message.channel)
	}
	if (j_b.test(message.content)){
		tts("p..p…lease… c-censor.. *sighs* … ahem!!… a-… *starts crying* ….. *sniff* j-…. J….. j… ARGH! *screams in agony* i-i… cant!… … *sighs*…. f-fine!! j-j-j-j…. J\\*B! *starts crying* and *faints while having seizures* oh! thats not... men pmo! 💜 i choose the ✨BEAR✨ sorry, but zahide won this trend! 💜 im just a girl 🎀 hope this helps! ✌️🙏 user25526345104761 literally predicted all ts🙏😭 IS THAT HYPERPIGMENTATION💜💜🙏 WHO IS THIS DIVAAAAA💜🎀💜🙏💜🙏 DID SHE SURVIVE💜💜💜🎀🙏🙏😭 MAMA A GIRL BEHIND YOU🙏💜🎀😭 TUNG TUNG TUNG SAHUR💜💜🎀 work, employment, bills, j\\*b, this but not ts, walk, life, grass, t\\*x, toothbrush, soap, employ, employed, br\\*sh, fresh, hygienic, hired, labor, wage, clean, shampoo, bathe, wipe, cleansed, sponge, deodorant, contract, exercise, healthy, hire, hiring, career, chores, organized, old spice, toothpaste, dishes, vegetables, fresh air, working, dove, work, employment, bills, j\\*b, this but not ts, walk, life, grass, t\\*x, toothbrush, soap, employ, employed, br\\*sh, fresh, hygienic, hired, labor, wage, clean, shampoo, bathe, wipe, cleansed, sponge, deodorant, contract, exercise, healthy, hire, hiring, career, chores, organized, old spice, toothpaste, dishes, vegetables, fresh air, working, dovework, employment, bills, j\\*b those who know:💀💀💀💀💀💀💀💀💀💀💀BOIII TS IS SO TUFF😂🫱🫱🫱THE FOG IS COMING😂😂😂HELP ITS RIPPING OFF MY SKIN😂😂😂 wait, is this a MANGO MANGO😈 reference 😱😱 chat! this is a MANGO MANGO😈 reference 🤣🤣🤣. boi, you won the Internet meme of the day 😂🫱. only the Balkans with noradrenaline will understand THOSE WHO KNOW💀💀💀💀 MANGO MANGO MANGO🥭 🥭 🥭TUNG TUNG TUNG SAHUR BOIII😂😂😂TS IS SO TUFF BOIII🥶🥶🥶🥶🔥🔥🔥🥵", message.channel);
	}	
	if (six.test(message.content) && seven.test(message.content)){
		tts("HOLY MOTHER FUCKNG SHT, ARE THOSE THE NUMBERS 6 AND 7?!?!?!😱😳😱😳😳😱⁉️😱⁉️‼️😱😳😱⁉️😱😳😱😳⁉️😱😳😱⁉️😱‼️😱😳😱6️⃣7️⃣6️⃣7️⃣6️⃣7️⃣6️⃣7️⃣ ATTENTION, 6️⃣7️⃣ SPOTTED, ATTENTION 67 SPOTTED, THIS IS NOT A DRILL, I REPEAT, THIS IS NOT A DRILL DEPLOY 6️⃣7️⃣ PROTOCOL /INITIATING 67 MODE... %67data... &programs x67&... 6767676767676️⃣7️⃣6️⃣7️⃣6️⃣7️⃣... I WILL SING THE 6️⃣ 7️⃣ SONG AND YOU WILL SING ALONG, WE WILL SING THE 6️⃣ 7️⃣ SONG AND YOU WILL SING ALONG, YOU WILL SING THE 6️⃣ 7️⃣ SONG AND WE WILL SING ALONG 6️⃣🤚😁✋️7️⃣‼️‼️‼️‼️‼️‼️", message.channel);
	}
	thinkingz = false;
});

client.on('messageCreate', async (message) => {
	try {
		if (message.author.bot) return;
		if (message.channel.id !== channelAlways || ignore.test(message.content) || ignr.test(message.content)) return;
		if (clear.test(message.content)){
			history = [{role: "system", content: syspwompt},];
			tts("mizook has been re-lobotomized.", message.channel);
			return;
		}
		if (thinkingz) return;

		const tmpmsg = await message.channel.send({content: "mizook is trying their best to think..."});
		thinkingz = true;

		const content = "<" + message.author.username + "> " + message.content;
		if (!content || content.trim().length === 0) return;

		// optional: fiwteww twiggers or smth idk
		console.log('Forwarding to Ollama:', content);
		
		history.push({role: "user", content: content})
		if (history.length > 15) history.splice(1, 1);

		// pwompt expecedd by lobotomized llm
		const payload = {
			model: model,
			messages: history,
			temperature: 1,
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
		await tts(reply, message.channel);
		tmpmsg.delete().catch(console.error);
		thinkingz = false;

	} catch (e){
		tts("mizook is not thinking actually", message.channel);
		thinkingz = false;
		console.error('Handler error:', e);
	}
});

client.once("clientReady", () => {
	console.log(`logged in as ${client.user.tag}`);

	const hi = new SlashCommandBuilder()
		.setName('hi')
		.setDescription('say hi to mizook. this command exists only to test the /tts function');

	client.application.commands.create(hi, server_id);
});

client.on(Events.InteractionCreate, interaction => {
	if(!interaction.isChatInputCommand()) return;
	if(interaction.commandName === "hi"){
		text = "HAIIII :3 i'm mizook, you should be able to hear me say this message";
		interaction.reply({content: text, tts: true});
    }
});

client.login(token);
