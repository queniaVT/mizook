use dotenvy::dotenv;
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::env;
use std::sync::OnceLock;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

static HTTP: OnceLock<reqwest::Client> = OnceLock::new();
static TOKEN: OnceLock<String> = OnceLock::new();
static MIZOOK_CHANNEL: &str = "1525586466908930065";
static MINECRAFT_CHANNEL: &str = "1525586466908930071";

#[tokio::main]
async fn main() {
	dotenv().ok();
	TOKEN.set(env::var("TOKEN").expect("haha look who doesnt have the bot token")).unwrap();
	HTTP.set(reqwest::Client::new()).unwrap();
	const URL: &str = "wss://gateway.fluxer.app/?v=1&encoding=json";
	let (mut socket, _) = connect_async(URL).await.expect("failed to connect to fluxer");
	let hello = socket.next().await.expect("gateway closed").expect("websocket error"); // hello
	let hello_json: serde_json::Value = serde_json::from_str(&hello.to_string()).expect("invalid json");
	let heartbeat_interval = hello_json["d"]["heartbeat_interval"].as_u64().expect("heartbeat interval isnt a number");
	let mut heartbeat = tokio::time::interval(std::time::Duration::from_millis(heartbeat_interval));
	heartbeat.tick().await;
	let token = TOKEN.get().unwrap();
	let identify = json!({"op": 2, "d": {"token": token, "properties": {"os": "linux", "browser": "mizook", "device": "mizook"}}}); // construct identify
	socket.send(Message::Text(identify.to_string().into())).await.expect("failed to send identify"); // send identify
	let ready = socket.next().await.expect("gateway closed").expect("websocket error"); // ready
	let ready_json: serde_json::Value = serde_json::from_str(&ready.to_string()).expect("invalid json");
	let username = ready_json["d"]["user"]["username"].as_str().expect("username isnt a string");
	println!("logged in as {username}");
	loop {
		tokio::select! {
			_ = heartbeat.tick() => {
				let heartbeat = json!({"op": 1, "d": null});
				socket.send(Message::Text(heartbeat.to_string().into())).await.expect("failed to send heartbeat");
			}
			message = socket.next() => {
				let message = message.expect("gateway closed").expect("websocket error");
				let event: serde_json::Value = serde_json::from_str(&message.to_string()).expect("ivalid json");
				if event["op"] == 0 {
					if event["t"] == "MESSAGE_CREATE" {
						let content = event["d"]["content"].as_str().unwrap_or("").to_lowercase();
						let message_id = event["d"]["id"].as_str().unwrap();
						let channel_id = event["d"]["channel_id"].as_str().expect("no channel id");
						let username = event["d"]["author"]["username"].as_str().unwrap_or("unknown");
						let author_bot = event["d"]["author"]["bot"].as_bool().unwrap_or(false);
						if channel_id == MIZOOK_CHANNEL {
						} else if channel_id == MINECRAFT_CHANNEL {
							if content.starts_with("/start") {
								println!("command used in #minecraft: /start");
								let output = tokio::process::Command::new("/run/wrappers/bin/sudo").args(["/run/current-system/sw/bin/systemctl", "start", "mcservurr"]).output().await.expect("failed to run systemctl");
								if output.status.success() {reply_message(channel_id, message_id, "startin teh servurr...").await;}
								else {reply_message(channel_id, message_id, "something got fucked up").await;}
							} else if content.starts_with("/restart") {
								println!("command used in #minecraft: /restart");
								let output = mcrcon(&["list"]).await;
								match output {
									Ok(output) => {
										if output.trim().starts_with("There are 0") {
											let output = tokio::process::Command::new("/run/wrappers/bin/sudo").args(["/run/current-system/sw/bin/systemctl", "restart", "mcservurr"]).output().await.expect("failed to run systemctl");
											if output.status.success() {reply_message(channel_id, message_id, "restartin teh servurr...").await;}
											else {reply_message(channel_id, message_id, "something got fucked up").await;} 
										}
										else {
											let players = output.split_whitespace().nth(2).unwrap_or("0");
											reply_message(channel_id, message_id, &format!("cannot restart servurr, {players} people online")).await;
										}
									} Err(error) => {println!("mcrcon blew up: {error}");}
								}
							} else if content.starts_with("/stop") {
								println!("command used in #minecraft: /stop");
								let output = mcrcon(&["list"]).await;
								match output {
									Ok(output) => {
										if output.trim().starts_with("There are 0") {
											let output = tokio::process::Command::new("/run/wrappers/bin/sudo").args(["/run/current-system/sw/bin/systemctl", "stop", "mcservurr"]).output().await.expect("failed to run systemctl");
											if output.status.success() {reply_message(channel_id, message_id, "stopin teh servurr...").await;}
											else {reply_message(channel_id, message_id, "something got fucked up").await;} 
										}
										else {
											let players = output.split_whitespace().nth(2).unwrap_or("0");
											reply_message(channel_id, message_id, &format!("cannot stop servurr, {players} people online")).await;
										}
									} Err(error) => {println!("mcrcon blew up: {error}");}
								}
							} else if content.starts_with("/status") {
								println!("command used in #minecraft: /status");
								let status = tokio::process::Command::new("/run/wrappers/bin/sudo").args(["/run/current-system/sw/bin/systemctl", "is-active", "mcservurr"]).output().await.expect("failed to run systemctl");
								let status = String::from_utf8_lossy(&status.stdout).trim().to_string();
								let output = mcrcon(&["list"]).await.unwrap();
								let players = output.split_once("online:").map(|(_, players)| players.replace("\x1b[0m", "").trim().replace(", ", "\n")).unwrap_or_default();
								reply_message(channel_id, message_id, &format!("{status}\nplayers online:\n{players}")).await;
							} else {
								let message = format!("<{username}> {content} :3");
								let json = serde_json::json!({"text": message});
								println!("forwarding fluxer2mc: {json}");
								let fluxer2mc_msg = mcrcon(&[&format!("tellraw @a {}", json)]).await;
								match fluxer2mc_msg {
									Ok(output) => println!("mcrcon succeeded: {output}"),
									Err(error) => println!("failed forwarding msg from fluxer to minecraft: {error}"),
								}
							}
						} else {
							if !author_bot && content.contains("crazy") {send_message(channel_id, "crazy? i was crazy once. they locked me in a room, a rubber room, a rubber room with rats, and rats make me crazy.").await;}
							if !author_bot && content.contains("job") {send_message(channel_id, "p..p…lease… c-censor.. *sighs* … ahem!!… a-… *starts crying* ….. *sniff* j-…. J….. j… ARGH! *screams in agony* i-i… cant!… … *sighs*…. f-fine!! j-j-j-j…. J\\*B! *starts crying and faints while having seizures* oh! thats not... men pmo! 💜 i choose the ✨BEAR✨ sorry, but zahide won this trend! 💜 im just a girl 🎀 hope this helps! ✌️🙏 user25526345104761 literally predicted all ts🙏😭 IS THAT HYPERPIGMENTATION💜💜🙏 WHO IS THIS DIVAAAAA💜🎀💜🙏💜🙏 DID SHE SURVIVE💜💜💜🎀🙏🙏😭 MAMA A GIRL BEHIND YOU🙏💜🎀😭 TUNG TUNG TUNG SAHUR💜💜🎀 work, employment, bills, j\\*b, this but not ts, walk, life, grass, tax, toothbrush, soap, employ, employed, br\\*sh, fresh, hygienic, hired, labor, wage, clean, shampoo, bathe, wipe, cleansed, sponge, deodorant, contract, exercise, healthy, hire, hiring, career, chores, organized, old spice, toothpaste, dishes, vegetables, fresh air, working, dove those who know:💀💀💀💀💀💀💀💀💀💀💀BOIII TS IS SO TUFF😂🫱🫱🫱THE FOG IS COMING😂😂😂HELP ITS RIPPING OFF MY SKIN😂😂😂 wait, is this a MANGO MANGO😈 reference 😱😱 chat! this is a MANGO MANGO😈 reference 🤣🤣🤣. boi, you won the Internet meme of the day 😂🫱. only the Balkans with noradrenaline will understand THOSE WHO KNOW💀💀💀💀 MANGO MANGO MANGO🥭 🥭 🥭TUNG TUNG TUNG SAHUR BOIII😂😂😂TS IS SO TUFF BOIII🥶🥶🥶🥶🔥🔥🔥🥵...user25526345104761.").await;}
							if !author_bot && content.contains("6") && content.contains("7") {send_message(channel_id, "HOLY MOTHER FUCKNG SHT, ARE THOSE THE NUMBERS 6 AND 7?!?!?!😱😳😱😳😳😱⁉️😱⁉️‼️😱😳😱⁉️😱😳😱😳⁉️😱😳😱⁉️😱‼️😱😳😱6️⃣7️⃣6️⃣7️⃣6️⃣7️⃣6️⃣7️⃣ ATTENTION, 6️⃣7️⃣ SPOTTED, ATTENTION 67 SPOTTED, THIS IS NOT A DRILL, I REPEAT, THIS IS NOT A DRILL DEPLOY 6️⃣7️⃣ PROTOCOL /INITIATING 67 MODE... %67data... &programs x67&... 6767676767676️⃣7️⃣6️⃣7️⃣6️⃣7️⃣... I WILL SING THE 6️⃣ 7️⃣ SONG AND YOU WILL SING ALONG, WE WILL SING THE 6️⃣ 7️⃣ SONG AND YOU WILL SING ALONG, YOU WILL SING THE 6️⃣ 7️⃣ SONG AND WE WILL SING ALONG 6️⃣🤚😁✋️7️⃣‼️‼️‼️‼️‼️‼️").await;}
							if !author_bot && content.contains("linux") && !content.contains("gnu") {send_message(channel_id, "I'd just like to interject for a moment. What you're refering to as Linux, is in fact, GNU/Linux, or as I've recently taken to calling it, GNU plus Linux. Linux is not an operating system unto itself, but rather another free component of a fully functioning GNU system made useful by the GNU corelibs, shell utilities and vital system components comprising a full OS as defined by POSIX.\n\nMany computer users run a modified version of the GNU system every day, without realizing it. Through a peculiar turn of events, the version of GNU which is widely used today is often called Linux, and many of its users are not aware that it is basically the GNU system, developed by the GNU Project.\n\nThere really is a Linux, and these people are using it, but it is just a part of the system they use. Linux is the kernel: the program in the system that allocates the machine's resources to the other programs that you run. The kernel is an essential part of an operating system, but useless by itself; it can only function in the context of a complete operating system. Linux is normally used in combination with the GNU operating system: the whole system is basically GNU with Linux added, or GNU/Linux. All the so-called Linux distributions are really distributions of GNU/Linux!").await;}
							if content.starts_with("/hi") {reply_message(channel_id, message_id, "HAIIII :3 im mizook <(^V^)>").await;}
						}
					}
				}
			}
		}
	}
}
async fn send_message(channel_id: &str, content: &str) {
	let http = HTTP.get().unwrap();
	let token = TOKEN.get().unwrap();
	http.post(format!("https://api.fluxer.app/v1/channels/{channel_id}/messages")).header("Authorization", format!("Bot {token}")).json(&json!({"content": content})).send().await.expect("failed to send message");
}
async fn reply_message(channel_id: &str, message_id: &str, content: &str) {
	let http = HTTP.get().unwrap();
	let token = TOKEN.get().unwrap();
	http.post(format!("https://api.fluxer.app/v1/channels/{channel_id}/messages")).header("Authorization", format!("Bot {token}")).json(&json!({"content": content, "message_reference": {"message_id": message_id}})).send().await.expect("failed to send reply");
}
async fn mcrcon(args: &[&str]) -> Result<String, String> {
	let output = tokio::process::Command::new("/run/current-system/sw/bin/mcrcon").args(["-H", "localhost", "-P", "25585", "-p", "mcservurrpasswd"]).args(args).output().await.map_err(|e| e.to_string())?;
	if !output.status.success() {return Err(String::from_utf8_lossy(&output.stderr).into_owned());}
	Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}
