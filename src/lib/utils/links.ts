export function printRoomName(roomName: string): string {
  return '<a href="#!/room/' + Game.shard.name + "/" + roomName + '">' + roomName + "</a>";
}

export function color(str: string, color: string): string {
  return `<font color='${color}'>${str}</font>`;
}

/**
 * Obtain the username of the player
 */
export function getUsername(): string {
  for (const i in Game.rooms) {
    const room = Game.rooms[i];
    if (room.controller && room.controller.my && room.controller.owner) {
      return room.controller.owner.username;
    }
  }
  for (const i in Game.creeps) {
    const creep = Game.creeps[i];
    if (creep.owner) {
      return creep.owner.username;
    }
  }
  console.log("ERROR: Could not determine username. You can set this manually");
  return "ERROR: Could not determine username.";
}
