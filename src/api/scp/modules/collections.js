import { octokit } from "../../../core/github"

export const getAllStories = async (req, res) => {
    try {
        const stories = await octokit.rest.repos.getContent({
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO,
            path: '_stories'
        })
        res.json(stories.data.map(item => ({ name: item.name })))
    } catch (error) {
        console.log(`Error on getAllStories: ${error}`)
        res.send(200).json({
            message: 'An error accour',
            error
        })
    }
} 