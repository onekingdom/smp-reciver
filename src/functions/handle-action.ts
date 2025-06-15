import { TwitchApi } from "@/services/twitchApi";

interface ActionEvent {
  broadcaster_user_id: string;
  broadcaster_user_name: string;
  chatter_user_id: string;
  chatter_user_name: string;
  message: string;
  action: string;
  parameters?: string | null;
}

export async function handleAction(event: ActionEvent, twitchApi: TwitchApi) {
  const { broadcaster_user_id, broadcaster_user_name, chatter_user_id, chatter_user_name, message } = event;

  const action = event.action.toLowerCase().split(".")[0];
  const actionArgs = event.action.toLowerCase().split(".").slice(1);

  switch (action) {
    case "minecraft":
        
      break;
  }




  
}


