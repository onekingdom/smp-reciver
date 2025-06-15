class MinecraftAction {
  constructor(private readonly action: string, private readonly parameters: string[]) {}

  async execute() {
    console.log("Executing Minecraft action", this.action, this.parameters);
  }


    


}

export default MinecraftAction;