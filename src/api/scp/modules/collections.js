import matter from "gray-matter";
import { octokit } from "../../../core/github"
import { orderBy } from 'lodash'

function awaitAll(count, asyncFn) {
    const promises = [];

    for (let i = 0; i < count; ++i) {
        promises.push(asyncFn());
    }

    return Promise.all(promises);
}

function removeEmpty(arr) {
    for (let i = 0; i < arr.length; i++) {
        if (Array.isArray(arr[i])) {
            if (arr[i].length === 0) {
                arr.splice(i, 1); // remove empty array
                i--; // adjust index after removal
            } else {
                removeEmpty(arr[i]); // recurse into non-empty array
            }
        } else if (typeof arr[i] === 'object' && arr[i] !== null) {
            if (Object.keys(arr[i]).length === 0) {
                arr.splice(i, 1); // remove empty object
                i--; // adjust index after removal
            } else {
                removeEmpty(arr[i]); // recurse into non-empty object
            }
        }
    }
    return arr;
}

const listAllContents = async (collections) => {
    const stories = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}?ref=HEAD', {
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
        path: collections
    });

    const categories = {};

    const handleItem = async (item) => {
        if (item.type === 'dir') {
            if (!categories[item.name]) {
                categories[item.name] = [];
            }
            const subItems = await listAllContents(item.path);
            categories[item.name] = categories[item.name].concat(subItems);
        }
        if (item.type === 'file') {
            if (!categories[item.name]) {
                categories[item.name] = [];
            }
            categories[item.name].push({ filename: item.name, path: item.path });
        }
    };

    const promises = [];
    const maxConcurrentRequests = 5; // Set the maximum number of concurrent requests here

    for (let i = 0; i < stories.data.length; i += maxConcurrentRequests) {
        const items = stories.data.slice(i, i + maxConcurrentRequests);
        const promisesSlice = items.map(item => handleItem(item));
        promises.push(awaitAll(maxConcurrentRequests, () => Promise.all(promisesSlice)));
    }

    await Promise.all(promises);

    return categories;
};

const normalizeResults = (contents) => {
    const newFormat = {};

    for (const lang in contents) {
        newFormat[lang] = [];
        for (let i = 0; i < contents[lang].length; i++) {
            if (contents[lang][i]['.gitkeep']) delete contents[lang][i]['.gitkeep']
            newFormat[lang].push(removeEmpty(contents[lang][0]))
        }
    }

    for (let key in newFormat) {
        if (Array.isArray(newFormat[key])) {
            newFormat[key] = newFormat[key].filter(item => Object.keys(item).length > 0);
        }
    }

    for (let key in newFormat) {
        if (Array.isArray(newFormat[key])) {
            newFormat[key] = newFormat[key].filter(item => Object.keys(item).length > 0);
        }
    }

    for (let key in newFormat) {
        if (newFormat[key] && newFormat[key].length) {
            const dataArray = newFormat[key];
            const extractedValues = [];

            for (let i = 0; i < dataArray.length; i++) {
                const dataObj = dataArray[i];
                const keys = Object.keys(dataObj);
                for (let j = 0; j < keys.length; j++) {
                    const key = keys[j];
                    const nestedObj = dataObj[key][0];
                    extractedValues.push({
                        filename: nestedObj.filename,
                        path: nestedObj.path,
                    });
                }
            }
            newFormat[key] = []
            newFormat[key].push(extractedValues);
            newFormat[key] = newFormat[key][0]
        }
    }

    return newFormat
}

const listSingleCategory = async (collections) => {
    const files = []
    const { data: contents } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}?ref=HEAD', {
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
        path: collections
    });

    for (let item of contents) {
        if (item.name !== '.gitkeep') {
            const { data: fileContent } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
                owner: process.env.GITHUB_OWNER,
                repo: process.env.GITHUB_REPO,
                path: item.path
            })
            const decodedContent = Buffer.from(fileContent.content, 'base64').toString();
            const { data, content } = matter(decodedContent);
            delete data.layout
            const encodedString = Buffer.from(content).toString("base64");
            files.push(Object.assign({ name: item.name, path: item.path }, data, { content: encodedString }))
        }
    }

    return files;
}

export const getAllStories = async (req, res) => {
    try {
        const contents = await listAllContents('collections/stories')
        const normalizedObjects = normalizeResults(contents)

        for (let lang in normalizedObjects) {
            if (normalizedObjects[lang].length > 0) {
                for (let item of normalizedObjects[lang]) {
                    const { data: fileContent } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
                        owner: process.env.GITHUB_OWNER,
                        repo: process.env.GITHUB_REPO,
                        path: item.path
                    })
                    const decodedContent = Buffer.from(fileContent.content, 'base64').toString();
                    const { data } = matter(decodedContent);
                    delete data.layout
                    Object.assign(item, data, { content: fileContent.content })
                }
            }
        }

        res.json({
            message: 'Fetch all stories',
            data: normalizedObjects
        })
    } catch (error) {
        console.log(`Error on getAllStories: ${error}`)
        res.json({
            message: error.message,
            error
        })
    }
}

export const getStory = async (req, res) => {
    try {
        const { language } = req.params
        const contents = await listSingleCategory(`collections/stories/${language}`)

        res.json({
            message: 'Fetch all stories',
            data: orderBy(contents, ['created_at'], ['desc'])
        })
    } catch (error) {
        console.log(`Error on getStory: ${error}`)
        res.json({
            message: error.message,
            error
        })
    }
}
