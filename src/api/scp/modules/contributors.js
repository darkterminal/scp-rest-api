import { octokit } from "../../../core/github"

export const getAllContributors = async (req, res) => {
    try {
        const contributors = await octokit.request('GET /repos/{owner}/{repo}/contributors', {
            owner: process.env.GITHUB_OWNER,
            repo: process.env.GITHUB_REPO
        })

        res.json({
            message: 'Fetch all contributors',
            data: {
                total_contributors: contributors.data.length,
                contributors: contributors.data.map(item => ({
                    username: item.login,
                    role_name: item.role_name,
                    html_url: item.html_url
                }))
            }
        })
    } catch (error) {
        console.log(`Error on getAllContributors: ${error}`)
        res.json({
            message: error.response.data.message,
            data: {
                total_contributors: 0,
                contributors: []
            }
        })
    }
}
