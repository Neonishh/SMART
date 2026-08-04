import * as chatbotService from "../services/chatbotService.js";

export async function postChat(req, res) {

    try {

        const { message, history } = req.body || {};

        const result = await chatbotService.getChatResponse(message, history);

        // Ensure response shape
        return res.status(200).json({
            reply: result.reply ?? "",
            sources: result.sources ?? [],
            cypher: result.cypher ?? null
        });

    }

    catch (error) {

        console.error("Chatbot Controller Error:", error);

        return res.status(500).json({
            reply: "Sorry, something went wrong processing your message.",
            sources: [],
            cypher: null
        });

    }

}
