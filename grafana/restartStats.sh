docker ps  | grep screeps | cut -d\  -f 1 | xargs -I{} docker restart  {}
