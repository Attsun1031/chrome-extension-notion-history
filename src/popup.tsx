import React, {ChangeEvent, useEffect, useState} from "react";
import {createRoot} from "react-dom/client";
import {
    Box,
    Button,
    ChakraProvider,
    Container,
    defaultSystem,
    Grid,
    GridItem,
    Group,
    Icon,
    IconProps,
    Input,
    InputAddon,
    InputGroup,
    Link,
    NumberInput,
    NumberInputValueChangeDetails,
    Text,
    VStack
} from "@chakra-ui/react";
import {getTime, sub} from "date-fns";
import {
    chromeHistoriesToNotionItems,
    isHistoryItemMatchedWord,
    isHistoryItemMatchedWorkspace,
    msToString
} from "./history";

// Chakra v3 dropped @chakra-ui/icons, so the search glyph lives here now.
const SearchIcon = (props: IconProps) => (
    <Icon
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.3-4.3"/>
    </Icon>
);

interface Options {
    daysBefore: number
    workspace: string
}

interface Result {
    results: chrome.history.HistoryItem[]
}

const saveOptions = (opts: Options, callback: () => void = () => {}) => {
    chrome.storage.local.set(opts, callback);
}

const getOptions = (defaultOpts: Options, callback: (opts: any) => void) => {
    chrome.storage.local.get(defaultOpts, callback);
}

const Popup = () => {
    // states
    const [daysBefore, setDaysBefore] = useState(7);
    const [workspace, setWorkspace] = useState("");
    const [searchWord, setSearchWord] = useState("");
    const [initialItems, setInitialItems] = useState<chrome.history.HistoryItem[]>([]);
    const [histories, setHistories] = useState<Result>({results: []});

    // event handlers
    const onChangeDaysBefore = (details: NumberInputValueChangeDetails) => {
        if (details.valueAsNumber > 0) {
            setDaysBefore(details.valueAsNumber);
        }
    }
    const onChangeWorkspace = (v: ChangeEvent<HTMLInputElement>) => {
        setWorkspace(v.target.value);
    }
    const onChangeSearchInput = (v: ChangeEvent<HTMLInputElement>) => {
        setSearchWord(v.target.value);
    }
    const onClickSave = () => {
        saveOptions({
            daysBefore: daysBefore,
            workspace: workspace
        })
    }

    // effects
    useEffect(() => {
        // load histories from chrom history
        const query = {
            text: "notion",
            startTime: getTime(sub(new Date(), {days: daysBefore})),
            maxResults: 1000
        }
        chrome.history.search(query, (results: chrome.history.HistoryItem[]) => {
            const items = chromeHistoriesToNotionItems(results);
            setInitialItems(items);
        });
    }, [daysBefore])

    useEffect(() => {
        // set filtered histories
        const items = initialItems.filter((h) => {
            return isHistoryItemMatchedWord(searchWord, h) && isHistoryItemMatchedWorkspace(workspace, h);
        })
        setHistories({results: items});
    }, [searchWord, workspace, initialItems]);

    useEffect(() => {
        // set options
        getOptions({daysBefore: 7, workspace: ""}, (opts) => {
            setDaysBefore(opts.daysBefore);
            setWorkspace(opts.workspace);
        })
    }, []);

    return (
        <>
            <ChakraProvider value={defaultSystem}>
                <Box w="540px">
                    <Box p={4}>
                        <Grid templateRows='repeat(2, 1fr)' templateColumns='repeat(3, 1fr)' gap={6}>
                            <GridItem>
                                <Group attached>
                                    <NumberInput.Root
                                        size="sm" value={String(daysBefore)} min={0} max={100}
                                        onValueChange={onChangeDaysBefore}>
                                        <NumberInput.Input />
                                    </NumberInput.Root>
                                    <InputAddon>days before</InputAddon>
                                </Group>
                            </GridItem>
                            <GridItem>
                                <Input size="sm" value={workspace} placeholder="workspace" onChange={onChangeWorkspace} />
                            </GridItem>
                            <GridItem>
                                <Button colorPalette="teal" size="xs" onClick={onClickSave}>Save</Button>
                            </GridItem>
                            <GridItem colSpan={3}>
                                <InputGroup startElement={<SearchIcon color="gray.300"/>}>
                                    <Input size="sm" placeholder="Search keyword" onChange={onChangeSearchInput}/>
                                </InputGroup>
                            </GridItem>
                        </Grid>
                    </Box>
                    <Box>
                        {histories.results.length > 0 && (
                            <VStack p={4} gap={4} align="flex-start">
                                {histories.results.map((h, index) => (
                                    <Grid templateColumns='4fr 1fr' gap={6} key={index}>
                                        <GridItem>
                                            {/*<Tooltip label={h.url} placement='right-start'>*/}
                                                <Link href={h.url} target="_blank">{h.title}</Link>
                                            {/*</Tooltip>*/}
                                        </GridItem>
                                        <GridItem>
                                            <Text fontSize="xs" textAlign="right">{msToString(h.lastVisitTime)}</Text>
                                        </GridItem>
                                    </Grid>)
                                )}
                            </VStack>
                        )}
                        {histories.results.length == 0 && (
                            <Container><Text>Loading...</Text></Container>
                        )}
                    </Box>
                </Box>
            </ChakraProvider>
        </>
    )
};

createRoot(document.getElementById("root")!!).render(
    <React.StrictMode>
        <Popup/>
    </React.StrictMode>
);
