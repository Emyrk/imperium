# example ./generate-rooms.sh shard3 E12S53
programname=$0

function usage {
    echo "usage: $programname <shard> <room_name> [server]"
    exit 1
}

[ -z $1 ] && { usage; }
[ -z $2 ] && { usage; }

shard=$1
room=$2
server=${3:-'Screeps.com'}
root=`git rev-parse --show-toplevel`


tmpTerrain=/tmp/${shard}-${room}-terrain.json
screeps-watcher room-terrain --config=${root}/config.yaml --shard=${shard} --server=${server} --room=${room} > ${tmpTerrain}
if [[ $? -ne 0 ]]; then
    echo "failed to download room terrain"
    exit 1
fi

tmpObjects=/tmp/${shard}-${room}-objects.json
screeps-watcher room-objects --config=${root}/config.yaml --shard=${shard} --server=${server} --room=${room} > ${tmpObjects}
if [[ $? -ne 0 ]]; then
    echo "failed to download room objects"
    exit 1
fi



dataDir=${root}/test/fakes/roomdata/${shard}-${room}
mkdir -p ${dataDir}

mv ${tmpTerrain} ${dataDir}/terrain.json
mv ${tmpObjects} ${dataDir}/objects.json



echo $dataDir


