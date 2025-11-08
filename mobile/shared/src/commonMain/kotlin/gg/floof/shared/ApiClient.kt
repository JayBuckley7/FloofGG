package gg.floof.shared

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.cookies.HttpCookies
import io.ktor.client.plugins.cookies.acceptAllCookies
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

class ApiClient(private val baseUrl: String) {
    private val http = HttpClient {
        install(HttpCookies) { acceptAllCookies() }
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
    }

    // Session
    suspend fun session(): SessionResponse =
        http.get("$baseUrl/session").body()

    // Auth (anonymous for now)
    suspend fun signInAnonymous(): OkResponse =
        http.post("$baseUrl/auth") {
            contentType(ContentType.Application.Json)
            setBody(AuthRequest(provider = "anonymous"))
        }.body()

    // Boards
    suspend fun listBoards(): List<Board> =
        http.get("$baseUrl/boards").body()

    suspend fun createBoard(req: CreateBoardRequest): CreateIdResponse =
        http.post("$baseUrl/boards") { contentType(ContentType.Application.Json); setBody(req) }.body()

    suspend fun getBoard(boardId: String): Board =
        http.get("$baseUrl/boards/get") { parameter("boardId", boardId) }.body()

    suspend fun updateBoard(req: UpdateBoardRequest): OkResponse =
        http.put("$baseUrl/boards") { contentType(ContentType.Application.Json); setBody(req) }.body()

    suspend fun deleteBoard(boardId: String): OkResponse =
        http.delete("$baseUrl/boards") { parameter("boardId", boardId) }.body()

    suspend fun getPublicBoard(boardId: String): Board? =
        http.get("$baseUrl/boards/public") { parameter("boardId", boardId) }.body()

    suspend fun duplicateBoard(boardId: String, withCards: Boolean): CreateIdResponse =
        http.post("$baseUrl/boards/duplicate") {
            contentType(ContentType.Application.Json)
            setBody(DuplicateBoardRequest(boardId, withCards))
        }.body()

    suspend fun cloneBoard(boardId: String): CreateIdResponse =
        http.post("$baseUrl/boards/clone") {
            contentType(ContentType.Application.Json)
            setBody(CloneBoardRequest(boardId))
        }.body()

    // Lanes
    suspend fun listLanes(boardId: String): List<Lane> =
        http.get("$baseUrl/lanes") { parameter("boardId", boardId) }.body()

    suspend fun listPublicLanes(boardId: String): List<Lane> =
        http.get("$baseUrl/lanes/public") { parameter("boardId", boardId) }.body()

    suspend fun createLane(req: CreateLaneRequest): CreateIdResponse =
        http.post("$baseUrl/lanes") { contentType(ContentType.Application.Json); setBody(req) }.body()

    suspend fun updateLane(req: UpdateLaneRequest): OkResponse =
        http.put("$baseUrl/lanes") { contentType(ContentType.Application.Json); setBody(req) }.body()

    suspend fun deleteLane(laneId: String): OkResponse =
        http.delete("$baseUrl/lanes") { parameter("laneId", laneId) }.body()

    suspend fun reorderLane(laneId: String, newPosition: Int): OkResponse =
        http.post("$baseUrl/lanes/reorder") { contentType(ContentType.Application.Json); setBody(ReorderLaneRequest(laneId, newPosition)) }.body()

    // Cards
    suspend fun listCards(laneId: String): List<Card> =
        http.get("$baseUrl/cards") { parameter("laneId", laneId) }.body()

    suspend fun listPublicCards(laneId: String): List<Card> =
        http.get("$baseUrl/cards/public") { parameter("laneId", laneId) }.body()

    suspend fun createCard(req: CreateCardRequest): CreateIdResponse =
        http.post("$baseUrl/cards") { contentType(ContentType.Application.Json); setBody(req) }.body()

    suspend fun updateCard(req: UpdateCardRequest): OkResponse =
        http.put("$baseUrl/cards") { contentType(ContentType.Application.Json); setBody(req) }.body()

    suspend fun deleteCard(cardId: String): OkResponse =
        http.delete("$baseUrl/cards") { parameter("cardId", cardId) }.body()

    suspend fun moveCard(req: MoveCardRequest): OkResponse =
        http.post("$baseUrl/cards/move") { contentType(ContentType.Application.Json); setBody(req) }.body()

    // Comments
    suspend fun listComments(cardId: String): List<Comment> =
        http.get("$baseUrl/comments") { parameter("cardId", cardId) }.body()

    suspend fun addComment(req: AddCommentRequest): CreateIdResponse =
        http.post("$baseUrl/comments") { contentType(ContentType.Application.Json); setBody(req) }.body()

    // Labels
    suspend fun listLabels(boardId: String): List<Label> =
        http.get("$baseUrl/labels") { parameter("boardId", boardId) }.body()

    suspend fun createLabel(req: CreateLabelRequest): CreateIdResponse =
        http.post("$baseUrl/labels") { contentType(ContentType.Application.Json); setBody(req) }.body()

    suspend fun labelsForCard(cardId: String): List<Label> =
        http.get("$baseUrl/labels/card") { parameter("cardId", cardId) }.body()

    suspend fun toggleLabelOnCard(req: ToggleLabelOnCardRequest): OkResponse =
        http.post("$baseUrl/labels/toggle") { contentType(ContentType.Application.Json); setBody(req) }.body()

    // Checklists
    suspend fun checklist(cardId: String): List<ChecklistItem> =
        http.get("$baseUrl/checklists") { parameter("cardId", cardId) }.body()

    suspend fun addChecklistItem(req: AddChecklistItemRequest): CreateIdResponse =
        http.post("$baseUrl/checklists") { contentType(ContentType.Application.Json); setBody(req) }.body()

    suspend fun toggleChecklistItem(req: ToggleChecklistItemRequest): OkResponse =
        http.put("$baseUrl/checklists") { contentType(ContentType.Application.Json); setBody(req) }.body()

    suspend fun deleteChecklistItem(itemId: String): OkResponse =
        http.delete("$baseUrl/checklists") { parameter("itemId", itemId) }.body()

    // Activities
    suspend fun activities(cardId: String): List<Activity> =
        http.get("$baseUrl/activities") { parameter("cardId", cardId) }.body()
}

@Serializable
data class SessionResponse(val user: User?)

@Serializable
data class OkResponse(val ok: Boolean = true)

@Serializable
data class CreateIdResponse(@SerialName("boardId") val boardId: String? = null,
                            @SerialName("laneId") val laneId: String? = null,
                            @SerialName("cardId") val cardId: String? = null,
                            @SerialName("commentId") val commentId: String? = null,
                            @SerialName("labelId") val labelId: String? = null,
                            @SerialName("itemId") val itemId: String? = null)

@Serializable data class User(val _id: String, val name: String? = null)
@Serializable data class Board(
    val _id: String,
    val name: String,
    val description: String? = null,
    val background: String? = null,
    val isPublic: Boolean? = null,
)
@Serializable data class Lane(val _id: String, val boardId: String, val name: String, val position: Int, val color: String? = null)
@Serializable data class Card(val _id: String, val laneId: String, val title: String, val description: String? = null, val position: Int)
@Serializable data class Comment(val _id: String, val cardId: String, val text: String, val createdAt: Long)
@Serializable data class Label(val _id: String, val boardId: String, val name: String, val color: String)
@Serializable data class ChecklistItem(val _id: String, val cardId: String, val text: String, val completed: Boolean, val position: Int)
@Serializable data class Activity(val _id: String, val cardId: String, val type: String, val text: String? = null, val createdAt: Long)

@Serializable data class CreateBoardRequest(val name: String, val description: String? = null, val background: String? = null, val isPublic: Boolean? = null)
@Serializable data class UpdateBoardRequest(val boardId: String, val name: String, val description: String? = null, val background: String? = null, val isPublic: Boolean? = null)
@Serializable data class DuplicateBoardRequest(val boardId: String, val withCards: Boolean)
@Serializable data class CloneBoardRequest(val boardId: String)
@Serializable data class CreateLaneRequest(val boardId: String, val name: String, val color: String? = null)
@Serializable data class UpdateLaneRequest(val laneId: String, val name: String, val color: String? = null)
@Serializable data class ReorderLaneRequest(val laneId: String, val newPosition: Int)
@Serializable data class CreateCardRequest(val laneId: String, val title: String, val description: String? = null)
@Serializable data class UpdateCardRequest(val cardId: String, val title: String, val description: String? = null)
@Serializable data class MoveCardRequest(val cardId: String, val newLaneId: String, val newPosition: Int)
@Serializable data class AddCommentRequest(val cardId: String, val text: String)
@Serializable data class CreateLabelRequest(val boardId: String, val name: String, val color: String)
@Serializable data class ToggleLabelOnCardRequest(val cardId: String, val labelId: String)
@Serializable data class AddChecklistItemRequest(val cardId: String, val text: String)
@Serializable data class ToggleChecklistItemRequest(val itemId: String, val completed: Boolean)

@Serializable data class AuthRequest(val provider: String)


