package gg.floof.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import gg.floof.shared.ApiClient
import gg.floof.shared.Board
import gg.floof.shared.Card
import gg.floof.shared.Lane
import gg.floof.shared.Comment
import gg.floof.shared.Label
import gg.floof.shared.ChecklistItem
import gg.floof.shared.Activity
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                App()
            }
        }
    }
}

@Composable
fun App() {
    // TODO: make this configurable; for now, read from local dev server env
    val baseUrl = remember { System.getenv("CONVEX_HTTP_BASE") ?: "http://10.0.2.2:8787" }
    val api = remember { ApiClient(baseUrl) }
    var boards by remember { mutableStateOf<List<Board>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var screen by remember { mutableStateOf<Screen>(Screen.Boards) }
    var selectedBoard by remember { mutableStateOf<Board?>(null) }

    LaunchedEffect(Unit) {
        try {
            // Ensure we have a session
            val session = api.session()
            if (session.user == null) {
                runCatching { api.signInAnonymous() }
            }
            boards = api.listBoards()
        } catch (t: Throwable) {
            error = t.message
        } finally {
            loading = false
        }
    }

    Scaffold(topBar = { TopAppBar(title = { Text("Floof Kanban") }) },
        floatingActionButton = {
            if (screen == Screen.Boards) {
                AddBoardFab(api) { created ->
                    boards = boards + created
                }
            }
        }
    ) { padding ->
        Box(Modifier.padding(padding)) {
            when (screen) {
                Screen.Boards -> when {
                    loading -> Column(Modifier.padding(16.dp)) { Text("Loading...") }
                    error != null -> Column(Modifier.padding(16.dp)) { Text("Error: ${error}") }
                    else -> BoardListScreen(
                        boards = boards,
                        onSelect = { board ->
                            selectedBoard = board
                            screen = Screen.Board
                        },
                        onUpdated = { updated -> boards = boards.map { if (it._id == updated._id) updated else it } },
                        onDeleted = { removedId -> boards = boards.filterNot { it._id == removedId } },
                        onCreated = { created -> boards = boards + created },
                        api = api,
                    )
                }
                Screen.Board -> selectedBoard?.let { board ->
                    BoardScreen(
                        board = board,
                        api = api,
                        onBack = {
                            screen = Screen.Boards
                            // refresh boards
                            LaunchedEffect("refreshBoards") {
                                runCatching { boards = api.listBoards() }
                            }
                        },
                        onBoardUpdated = { updated -> selectedBoard = updated; boards = boards.map { if (it._id == updated._id) updated else it } },
                        onBoardDeleted = { deletedId -> screen = Screen.Boards; boards = boards.filterNot { it._id == deletedId } },
                    )
                }
            }
        }
    }
}

@Composable
fun BoardListScreen(
    boards: List<Board>,
    onSelect: (Board) -> Unit,
    onUpdated: (Board) -> Unit,
    onDeleted: (String) -> Unit,
    onCreated: (Board) -> Unit,
    api: ApiClient,
) {
    LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
        items(boards) { board ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .clickable { onSelect(board) },
            ) {
                var menuExpanded by remember { mutableStateOf(false) }
                Column(Modifier.padding(16.dp)) {
                    Row(Modifier.fillMaxWidth()) {
                        Text(board.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        Text("⋮", modifier = Modifier.clickable { menuExpanded = true }.padding(4.dp))
                        DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                            DropdownMenuItem(text = { Text("Rename") }, onClick = {
                                menuExpanded = false
                                RenameBoardDialog(initial = board.name) { newName ->
                                    LaunchedEffect("rename-${'$'}{board._id}") {
                                        val updated = board.copy(name = newName)
                                        runCatching { api.updateBoard(gg.floof.shared.UpdateBoardRequest(board._id, newName, board.description)) }
                                        onUpdated(updated)
                                    }
                                }
                            })
                            DropdownMenuItem(text = { Text("Duplicate") }, onClick = {
                                menuExpanded = false
                                DuplicateBoardDialog { withCards ->
                                    LaunchedEffect("duplicate-${'$'}{board._id}") {
                                        val resp = runCatching { api.duplicateBoard(board._id, withCards) }.getOrNull()
                                        if (resp?.boardId != null) {
                                            val created = runCatching { api.getBoard(resp.boardId) }.getOrNull()
                                            if (created != null) onCreated(created)
                                        }
                                    }
                                }
                            })
                            DropdownMenuItem(text = { Text("Delete") }, onClick = {
                                menuExpanded = false
                                ConfirmDialog(title = "Delete board?", message = "This will remove all lanes and cards.") {
                                    LaunchedEffect("delete-${'$'}{board._id}") {
                                        runCatching { api.deleteBoard(board._id) }
                                        onDeleted(board._id)
                                    }
                                }
                            })
                        }
                    }
                    if (!board.description.isNullOrBlank()) {
                        Spacer(Modifier.height(4.dp))
                        Text(board.description!!, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}

@Composable
fun BoardScreen(
    board: Board,
    api: ApiClient,
    onBack: () -> Unit,
    onBoardUpdated: (Board) -> Unit,
    onBoardDeleted: (String) -> Unit,
) {
    var lanes by remember { mutableStateOf<List<Lane>>(emptyList()) }
    var cardsByLane by remember { mutableStateOf<Map<String, List<Card>>>(emptyMap()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    var localBoard by remember { mutableStateOf(board) }
    var addLaneOpen by remember { mutableStateOf(false) }
    var renameBoardOpen by remember { mutableStateOf(false) }
    var deleteBoardOpen by remember { mutableStateOf(false) }
    var duplicateOpen by remember { mutableStateOf(false) }

    LaunchedEffect(localBoard._id) {
        try {
            val ls = api.listLanes(localBoard._id)
            lanes = ls
            val map = mutableMapOf<String, List<Card>>()
            for (lane in ls) {
                map[lane._id] = api.listCards(lane._id)
            }
            cardsByLane = map
        } catch (t: Throwable) {
            error = t.message
        } finally {
            loading = false
        }
    }

    Column(Modifier.fillMaxSize().padding(8.dp)) {
        TextButton(onClick = onBack) { Text("← Back") }
        Row(Modifier.fillMaxWidth()) {
            Text(localBoard.name, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f).padding(8.dp))
            Row {
                TextButton(onClick = { renameBoardOpen = true }) { Text("Rename") }
                TextButton(onClick = { duplicateOpen = true }) { Text("Duplicate") }
                TextButton(onClick = {
                    val newPublic = !(localBoard.isPublic ?: false)
                    scope.launch {
                        runCatching { api.updateBoard(gg.floof.shared.UpdateBoardRequest(localBoard._id, localBoard.name, localBoard.description, localBoard.background, newPublic)) }
                        localBoard = localBoard.copy(isPublic = newPublic)
                        onBoardUpdated(localBoard)
                    }
                }) { Text(if (localBoard.isPublic == true) "Make Private" else "Make Public") }
                TextButton(onClick = { deleteBoardOpen = true }, colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Text("Delete") }
            }
        }
        if (renameBoardOpen) {
            RenameBoardDialog(initial = localBoard.name) { newName ->
                renameBoardOpen = false
                scope.launch {
                    runCatching { api.updateBoard(gg.floof.shared.UpdateBoardRequest(localBoard._id, newName, localBoard.description)) }
                    localBoard = localBoard.copy(name = newName)
                    onBoardUpdated(localBoard)
                }
            }
        }
        if (deleteBoardOpen) {
            ConfirmDialog(title = "Delete board?", message = "This will remove all lanes and cards.") {
                deleteBoardOpen = false
                scope.launch {
                    runCatching { api.deleteBoard(localBoard._id) }
                    onBoardDeleted(localBoard._id)
                }
            }
        }
        if (duplicateOpen) {
            DuplicateBoardDialog { withCards ->
                duplicateOpen = false
                scope.launch {
                    runCatching { api.duplicateBoard(localBoard._id, withCards) }
                }
            }
        }
        when {
            loading -> Text("Loading...", modifier = Modifier.padding(16.dp))
            error != null -> Text("Error: ${error}", modifier = Modifier.padding(16.dp))
            else -> {
                var selectedCard by remember { mutableStateOf<Card?>(null) }
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())) {
                    for (lane in lanes.sortedBy { it.position }) {
                        Column(Modifier.width(260.dp).padding(8.dp)) {
                            Row(Modifier.fillMaxWidth()) {
                                Text(lane.name, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                                LaneMenu(
                                    onRename = { newName ->
                                        scope.launch {
                                            runCatching { api.updateLane(gg.floof.shared.UpdateLaneRequest(lane._id, newName, lane.color)) }
                                            lanes = lanes.map { if (it._id == lane._id) it.copy(name = newName) else it }
                                        }
                                    },
                                    onDelete = {
                                        scope.launch {
                                            runCatching { api.deleteLane(lane._id) }
                                            lanes = lanes.filterNot { it._id == lane._id }
                                            cardsByLane = cardsByLane - lane._id
                                        }
                                    },
                                    onMoveLeft = {
                                        val current = lane.position
                                        val target = (current - 1).coerceAtLeast(0)
                                        scope.launch {
                                            runCatching { api.reorderLane(lane._id, target) }
                                            lanes = lanes.map { l ->
                                                when (l._id) {
                                                    lane._id -> l.copy(position = target)
                                                    else -> if (l.position in target until current) l.copy(position = l.position + 1) else l
                                                }
                                            }
                                        }
                                    },
                                    onMoveRight = {
                                        val current = lane.position
                                        val target = (current + 1).coerceAtMost(lanes.size - 1)
                                        scope.launch {
                                            runCatching { api.reorderLane(lane._id, target) }
                                            lanes = lanes.map { l ->
                                                when (l._id) {
                                                    lane._id -> l.copy(position = target)
                                                    else -> if (l.position in (current + 1)..target) l.copy(position = l.position - 1) else l
                                                }
                                            }
                                        }
                                    }
                                )
                            }
                            Spacer(Modifier.height(8.dp))
                            val cards = cardsByLane[lane._id].orEmpty().sortedBy { it.position }
                            cards.forEach { card ->
                                CardRow(card = card,
                                    onDelete = {
                                        scope.launch {
                                            runCatching { api.deleteCard(card._id) }
                                            cardsByLane = cardsByLane.toMutableMap().apply {
                                                put(lane._id, get(lane._id).orEmpty().filterNot { it._id == card._id })
                                            }
                                        }
                                    },
                                    onEdit = { newTitle ->
                                        scope.launch {
                                            runCatching { api.updateCard(gg.floof.shared.UpdateCardRequest(card._id, newTitle, card.description)) }
                                            cardsByLane = cardsByLane.toMutableMap().apply {
                                                val list = get(lane._id).orEmpty().map { if (it._id == card._id) it.copy(title = newTitle) else it }
                                                put(lane._id, list)
                                            }
                                        }
                                    },
                                    onMoveToLane = { newLaneId ->
                                        scope.launch {
                                            runCatching { api.moveCard(gg.floof.shared.MoveCardRequest(card._id, newLaneId, 0)) }
                                            val fromList = cardsByLane[lane._id].orEmpty().filterNot { it._id == card._id }
                                            val moved = card.copy(laneId = newLaneId, position = 0)
                                            val toList = listOf(moved) + cardsByLane[newLaneId].orEmpty()
                                            cardsByLane = cardsByLane.toMutableMap().apply {
                                                put(lane._id, fromList)
                                                put(newLaneId, toList)
                                            }
                                        }
                                    },
                                    onOpen = { selectedCard = card }
                                )
                            }
                            AddCardRow { title ->
                                scope.launch {
                                    val resp = runCatching { api.createCard(gg.floof.shared.CreateCardRequest(lane._id, title, null)) }.getOrNull()
                                    if (resp?.cardId != null) {
                                        val new = gg.floof.shared.Card(resp.cardId, lane._id, title, null, position = cards.size)
                                        cardsByLane = cardsByLane.toMutableMap().apply {
                                            put(lane._id, cardsByLane[lane._id].orEmpty() + new)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Column(Modifier.width(260.dp).padding(8.dp)) {
                        OutlinedButton(onClick = { addLaneOpen = true }, modifier = Modifier.fillMaxWidth()) { Text("+ Add lane") }
                    }
                }
                if (selectedCard != null) {
                    Dialog(onDismissRequest = { selectedCard = null }) {
                        Surface(Modifier.fillMaxWidth().padding(8.dp)) {
                            CardDetailSheet(
                                card = selectedCard!!,
                                boardId = localBoard._id,
                                api = api,
                                onClose = { selectedCard = null },
                                onCardUpdated = { updated ->
                                    cardsByLane = cardsByLane.toMutableMap().apply {
                                        val laneId = updated.laneId
                                        put(laneId, get(laneId).orEmpty().map { if (it._id == updated._id) updated else it })
                                    }
                                },
                                onCardDeleted = { deletedId ->
                                    cardsByLane = cardsByLane.toMutableMap().apply {
                                        for ((lid, list) in entries) put(lid, list.filterNot { it._id == deletedId })
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
        if (addLaneOpen) {
            AddLaneDialog { name ->
                addLaneOpen = false
                scope.launch {
                    val resp = runCatching { api.createLane(gg.floof.shared.CreateLaneRequest(localBoard._id, name, null)) }.getOrNull()
                    if (resp?.laneId != null) {
                        val newLane = gg.floof.shared.Lane(resp.laneId, localBoard._id, name, position = lanes.size, color = null)
                        lanes = lanes + newLane
                    }
                }
            }
        }
    }
}

sealed class Screen { data object Boards : Screen(); data object Board : Screen() }
sealed class PublicScreen { data class Board(val boardId: String, val name: String) : PublicScreen() }

@Composable
fun AddBoardFab(api: ApiClient, onCreated: (Board) -> Unit) {
    var open by remember { mutableStateOf(false) }
    FloatingActionButton(onClick = { open = true }) { Text("+") }
    if (open) {
        AddBoardDialog { name, desc ->
            open = false
            LaunchedEffect("create-board") {
                val resp = runCatching { api.createBoard(gg.floof.shared.CreateBoardRequest(name, desc)) }.getOrNull()
                if (resp?.boardId != null) {
                    val created = runCatching { api.getBoard(resp.boardId) }.getOrNull()
                    if (created != null) onCreated(created)
                }
            }
        }
    }
}

@Composable
fun AddBoardDialog(onDone: (String, String?) -> Unit) {
    var name by remember { mutableStateOf("") }
    var desc by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = {},
        title = { Text("Create board") },
        text = {
            Column {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") })
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = desc, onValueChange = { desc = it }, label = { Text("Description (optional)") })
            }
        },
        confirmButton = { TextButton(enabled = name.isNotBlank(), onClick = { onDone(name.trim(), desc.trim().ifBlank { null }) }) { Text("Create") } },
        dismissButton = { TextButton(onClick = { onDone("", null) }) { Text("Cancel") } }
    )
}

@Composable
fun RenameBoardDialog(initial: String, onDone: (String) -> Unit) {
    var name by remember { mutableStateOf(initial) }
    AlertDialog(onDismissRequest = {}, title = { Text("Rename board") },
        text = { OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") }) },
        confirmButton = { TextButton(enabled = name.isNotBlank(), onClick = { onDone(name.trim()) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = { onDone(initial) }) { Text("Cancel") } })
}

@Composable
fun ConfirmDialog(title: String, message: String, onConfirm: () -> Unit) {
    AlertDialog(onDismissRequest = {}, title = { Text(title) }, text = { Text(message) },
        confirmButton = { TextButton(onClick = onConfirm) { Text("Confirm") } },
        dismissButton = { TextButton(onClick = onConfirm) { Text("Cancel") } }
    )
}

@Composable
fun DuplicateBoardDialog(onDone: (Boolean) -> Unit) {
    var withCards by remember { mutableStateOf(true) }
    AlertDialog(onDismissRequest = {}, title = { Text("Duplicate board") },
        text = {
            Row { Checkbox(checked = withCards, onCheckedChange = { withCards = it }); Spacer(Modifier.width(8.dp)); Text("Include cards") }
        },
        confirmButton = { TextButton(onClick = { onDone(withCards) }) { Text("Duplicate") } },
        dismissButton = { TextButton(onClick = { onDone(false) }) { Text("Cancel") } }
    )
}

@Composable
fun LaneMenu(
    onRename: (String) -> Unit,
    onDelete: () -> Unit,
    onMoveLeft: () -> Unit,
    onMoveRight: () -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Text("⋮", modifier = Modifier.clickable { expanded = true }.padding(4.dp))
    DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
        DropdownMenuItem(text = { Text("Rename") }, onClick = {
            expanded = false
            TextInputDialog(title = "Rename lane", initial = "") { value -> if (value.isNotBlank()) onRename(value.trim()) }
        })
        DropdownMenuItem(text = { Text("Move left") }, onClick = { expanded = false; onMoveLeft() })
        DropdownMenuItem(text = { Text("Move right") }, onClick = { expanded = false; onMoveRight() })
        DropdownMenuItem(text = { Text("Delete") }, onClick = { expanded = false; onDelete() })
    }
}

@Composable
fun TextInputDialog(title: String, initial: String, onDone: (String) -> Unit) {
    var text by remember { mutableStateOf(initial) }
    AlertDialog(onDismissRequest = {}, title = { Text(title) },
        text = { OutlinedTextField(value = text, onValueChange = { text = it }, label = { Text("Text") }) },
        confirmButton = { TextButton(onClick = { onDone(text) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = { onDone(initial) }) { Text("Cancel") } }
    )
}

@Composable
fun AddLaneDialog(onDone: (String) -> Unit) {
    TextInputDialog(title = "Add lane", initial = "") { value -> onDone(value) }
}

@Composable
fun AddCardRow(onAdd: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    if (!open) {
        TextButton(onClick = { open = true }) { Text("+ Add card") }
    } else {
        var title by remember { mutableStateOf("") }
        Row(Modifier.fillMaxWidth()) {
            OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Card title") }, modifier = Modifier.weight(1f))
            Spacer(Modifier.width(8.dp))
            Button(enabled = title.isNotBlank(), onClick = { onAdd(title.trim()); open = false }) { Text("Add") }
        }
    }
}

@Composable
fun CardRow(
    card: Card,
    onDelete: () -> Unit,
    onEdit: (String) -> Unit,
    onMoveToLane: (String) -> Unit,
    onOpen: () -> Unit,
) {
    var menu by remember { mutableStateOf(false) }
    var editOpen by remember { mutableStateOf(false) }
    var moveOpen by remember { mutableStateOf(false) }
    Card(Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
        Column(Modifier.padding(12.dp)) {
            Row(Modifier.fillMaxWidth()) {
                Text(card.title, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f).clickable { onOpen() })
                Text("⋮", modifier = Modifier.clickable { menu = true }.padding(4.dp))
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(text = { Text("Edit title") }, onClick = { menu = false; editOpen = true })
                    DropdownMenuItem(text = { Text("Move to lane…") }, onClick = { menu = false; moveOpen = true })
                    DropdownMenuItem(text = { Text("Delete") }, onClick = { menu = false; onDelete() })
                }
            }
            if (!card.description.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(card.description!!, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
    if (editOpen) {
        TextInputDialog(title = "Edit card title", initial = card.title) { value ->
            editOpen = false
            if (value.isNotBlank()) onEdit(value.trim())
        }
    }
    if (moveOpen) {
        TextInputDialog(title = "Move to lane (id)", initial = "") { value ->
            moveOpen = false
            if (value.isNotBlank()) onMoveToLane(value.trim())
        }
    }
}

@Composable
fun CardDetailSheet(
    card: Card,
    boardId: String,
    api: ApiClient,
    onClose: () -> Unit,
    onCardUpdated: (Card) -> Unit,
    onCardDeleted: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var title by remember { mutableStateOf(card.title) }
    var description by remember { mutableStateOf(card.description ?: "") }
    var comments by remember { mutableStateOf<List<Comment>>(emptyList()) }
    var labels by remember { mutableStateOf<List<Label>>(emptyList()) }
    var cardLabels by remember { mutableStateOf<Set<String>>(emptySet()) }
    var checklist by remember { mutableStateOf<List<ChecklistItem>>(emptyList()) }
    var activities by remember { mutableStateOf<List<Activity>>(emptyList()) }
    var lanes by remember { mutableStateOf<List<Lane>>(emptyList()) }

    LaunchedEffect(card._id) {
        comments = runCatching { api.listComments(card._id) }.getOrElse { emptyList() }
        labels = runCatching { api.listLabels(boardId) }.getOrElse { emptyList() }
        val currentLabels = runCatching { api.labelsForCard(card._id) }.getOrElse { emptyList() }
        cardLabels = currentLabels.map { it._id }.toSet()
        checklist = runCatching { api.checklist(card._id) }.getOrElse { emptyList() }
        activities = runCatching { api.activities(card._id) }.getOrElse { emptyList() }
        lanes = runCatching { api.listLanes(boardId) }.getOrElse { emptyList() }
    }

    Column(Modifier.fillMaxWidth().padding(16.dp)) {
        Row(Modifier.fillMaxWidth()) {
            Text("Card", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
            TextButton(onClick = onClose) { Text("Close") }
            TextButton(onClick = {
                scope.launch {
                    runCatching { api.updateCard(gg.floof.shared.UpdateCardRequest(card._id, title.trim().ifBlank { card.title }, description.trim().ifBlank { null })) }
                    val updated = card.copy(title = title.trim().ifBlank { card.title }, description = description.trim().ifBlank { null })
                    onCardUpdated(updated)
                }
            }) { Text("Save") }
            TextButton(onClick = {
                scope.launch {
                    runCatching { api.deleteCard(card._id) }
                    onCardDeleted(card._id)
                    onClose()
                }
            }, colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)) { Text("Delete") }
        }

        OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Title") }, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth())

        Spacer(Modifier.height(16.dp))
        Text("Checklist", style = MaterialTheme.typography.titleMedium)
        checklist.forEach { item ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = item.completed, onCheckedChange = { checked ->
                    scope.launch {
                        runCatching { api.toggleChecklistItem(gg.floof.shared.ToggleChecklistItemRequest(item._id, checked)) }
                        checklist = checklist.map { if (it._id == item._id) it.copy(completed = checked) else it }
                    }
                })
                Text(item.text, Modifier.weight(1f))
                TextButton(onClick = {
                    scope.launch {
                        runCatching { api.deleteChecklistItem(item._id) }
                        checklist = checklist.filterNot { it._id == item._id }
                    }
                }) { Text("Remove") }
            }
        }
        AddInlineText(label = "Add checklist item") { text ->
            scope.launch {
                val resp = runCatching { api.addChecklistItem(gg.floof.shared.AddChecklistItemRequest(card._id, text)) }.getOrNull()
                if (resp?.itemId != null) checklist = checklist + gg.floof.shared.ChecklistItem(resp.itemId, card._id, text, false, position = checklist.size)
            }
        }

        Spacer(Modifier.height(16.dp))
        Text("Labels", style = MaterialTheme.typography.titleMedium)
        FlowRowMain {
            labels.forEach { label ->
                val assigned = cardLabels.contains(label._id)
                FilterChipMain(text = label.name, selected = assigned) {
                    scope.launch {
                        runCatching { api.toggleLabelOnCard(gg.floof.shared.ToggleLabelOnCardRequest(card._id, label._id)) }
                        cardLabels = if (assigned) cardLabels - label._id else cardLabels + label._id
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))
        Text("Move", style = MaterialTheme.typography.titleMedium)
        var moveLane by remember { mutableStateOf(card.laneId) }
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(value = moveLane, onValueChange = { moveLane = it }, label = { Text("Lane id") }, modifier = Modifier.weight(1f))
            Spacer(Modifier.width(8.dp))
            Button(onClick = {
                scope.launch {
                    runCatching { api.moveCard(gg.floof.shared.MoveCardRequest(card._id, moveLane, 0)) }
                    onCardUpdated(card.copy(laneId = moveLane))
                }
            }) { Text("Move") }
        }

        Spacer(Modifier.height(16.dp))
        Text("Comments", style = MaterialTheme.typography.titleMedium)
        comments.forEach { c ->
            Column(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Text(c.text)
                Text("${'$'}{c.createdAt}", style = MaterialTheme.typography.bodySmall)
            }
        }
        AddInlineText(label = "Add comment") { text ->
            scope.launch {
                runCatching { api.addComment(gg.floof.shared.AddCommentRequest(card._id, text)) }
                comments = runCatching { api.listComments(card._id) }.getOrElse { comments }
            }
        }

        Spacer(Modifier.height(16.dp))
        Text("Activity", style = MaterialTheme.typography.titleMedium)
        activities.forEach { a ->
            Text(a.type + (a.text?.let { ": ${'$'}it" } ?: ""), style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
fun AddInlineText(label: String, onAdd: (String) -> Unit) {
    var text by remember { mutableStateOf("") }
    Row(Modifier.fillMaxWidth()) {
        OutlinedTextField(value = text, onValueChange = { text = it }, label = { Text(label) }, modifier = Modifier.weight(1f))
        Spacer(Modifier.width(8.dp))
        Button(enabled = text.isNotBlank(), onClick = { onAdd(text.trim()); text = "" }) { Text("Add") }
    }
}

@Composable
fun FlowRowMain(content: @Composable () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Start) { content() }
}

@Composable
fun FilterChipMain(text: String, selected: Boolean, onClick: () -> Unit) {
    val colors = if (selected) ButtonDefaults.buttonColors() else ButtonDefaults.outlinedButtonColors()
    OutlinedButton(onClick = onClick, modifier = Modifier.padding(end = 8.dp, bottom = 8.dp)) { Text(text) }
}

