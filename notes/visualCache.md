```
# ProgramSpawnControl.visual is not cached
calls		time		avg		function
40		21.0		0.525		LogisticNeeds.visual
40		7.8		0.195		LogisticsAvailable.visual
200		5.9		0.030		RoomVisual.box
160		5.4		0.034		RoomVisual.structure
40		4.8		0.119		ProgramSpawnControl.visual
700		3.5		0.005		RoomVisual.text
840		3.4		0.004		RoomVisual.line
180		2.1		0.012		RoomVisual.poly
280		1.8		0.006		RoomVisual.rect
60		1.5		0.025		RoomVisual.animatedPosition
80		0.8		0.010		ProgramSpawnControl.room:get
80		0.5		0.006		RoomVisual.circle
23		0.2		0.009		SavedState.exists
40		0.1		0.003		RoomVisual.export
80		0.1		0.002		Process.memory:get
23		0.1		0.003		SavedState.deleted
23		0.1		0.003		SavedState.memory:get
0		0.0		NaN		ProgramHeapRoomLogistics.execute
0		0.0		NaN		ProgramSpawnControl.execute
Avg: 17.35	Total: 312.31	Ticks: 18
```

```
# ProgramSpawnControl.visual is cached
calls		time		avg		function
40		21.7		0.543		LogisticNeeds.visual
40		9.0		0.224		LogisticsAvailable.visual
160		5.1		0.032		RoomVisual.structure
160		4.9		0.031		RoomVisual.box
660		3.5		0.005		RoomVisual.text
680		3.0		0.004		RoomVisual.line
180		2.3		0.013		RoomVisual.poly
60		2.0		0.033		RoomVisual.animatedPosition
240		1.5		0.006		RoomVisual.rect
40		1.4		0.036		ProgramSpawnControl.visual
40		0.5		0.014		RoomVisual.import
80		0.5		0.007		RoomVisual.circle
40		0.5		0.012		ProgramSpawnControl.room:get
25		0.3		0.011		SavedState.exists
40		0.1		0.002		Process.memory:get
25		0.1		0.003		SavedState.deleted
25		0.1		0.003		SavedState.memory:get
0		0.0		NaN		ProgramHeapRoomLogistics.execute
0		0.0		NaN		ProgramSpawnControl.execute
Avg: 18.39	Total: 331.09	Ticks: 18
```