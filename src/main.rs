use dotenvy::dotenv;
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::env;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

#[tokio::main]
async fn main() {
	dotenv().ok();
	let token = env::var("TOKEN").expect("haha look who doesnt have the bot token");
	let url = "wss://gateway.fluxer.app/?v=1&encoding=json";
	let (mut socket, _) = connect_async(url).await.expect("failed to connect to fluxer");
	let hello = socket.next().await.expect("gateway closed").expect("websocket error"); // hello
	let hello_json: serde_json::Value = serde_json::from_str(&hello.to_string()).expect("invalid json");
	let heartbeat_interval = hello_json["d"]["heartbeat_interval"].as_u64().expect("heartbeat interval isnt a number");
	let mut heartbeat = tokio::time::interval(std::time::Duration::from_millis(heartbeat_interval));
	heartbeat.tick().await;
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
				println!("{message}");
			}
		}
	}
}
