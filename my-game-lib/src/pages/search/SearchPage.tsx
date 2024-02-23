import React, { useEffect, useState } from 'react';
import searchGames from '../../services/SearchGame';
import Pagination from '@mui/material/Pagination';
import { SearchGameResult } from '../../models/SearchGameResult';
import CardGameResult from '../../components/CardGameResult/CardGameResult';
import AlertModal from '../../components/CustomAlert/CustomAlert';
import './SearchPage.css'
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { AddGameToUserCollection } from '../../services/FirebaseService';
import { IconButton, Input, SelectChangeEvent } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Game } from '../../models/Game';
import AddGameModal from '../../components/AddGameModal/AddGameModal';
import { Platform } from '../../models/SearchPlatformResult';
import { GameStatus } from '../../models/GameStatus';
import { useNavigate } from 'react-router-dom';

const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG || '');
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

const SearchPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchGameResult[]>([]);
    const [totalResults, setTotalResults] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [user, setUser] = useState(auth.currentUser);
    const [openModal, setOpenModal] = useState(false);
    const [selectedGame, setSelectedGame] = useState<SearchGameResult>();
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [statuses, setStatuses] = useState<GameStatus[]>([]);
    const [game, setGame] = useState<Game>();
    const [selectedPlatform, setSelectedPlatform] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [openAlert, setOpenAlert] = useState(false);
    const [alertSeverity, setAlertSeverity] = useState<"success" | "error">("error");

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
        });

        // Limpeza do efeito
        return () => unsubscribe();
    }, []);

    const handlePlatformChange = (event: SelectChangeEvent) => {
        setSelectedPlatform(event.target.value as string);
        console.log(selectedPlatform);
    }

    const handleStatusChange = (event: SelectChangeEvent) => {
        setSelectedStatus(event.target.value as string);
    }

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleSearch = async (page: number) => {
        const { results, totalCount } = await searchGames(searchTerm);
        setSearchResults(results);
        setTotalResults(totalCount);
        setCurrentPage(page);
    };

    const handlePaginationChange = async (event: React.ChangeEvent<unknown>, page: number) => {
        const { results } = await searchGames(searchTerm, page);
        setSearchResults(results);
        setCurrentPage(page);
    };

    const handleGoBack = () => {
        navigate('/home');
    }

    const handleOpenModal = async (game: SearchGameResult) => {
        await setSelectedGame(game);
        if (game) {
            setPlatforms(game.platforms);
            setStatuses([
                { id: 1, name: 'Playing', slug: 'playing' },
                { id: 2, name: 'Toplay', slug: 'toplay' },
                { id: 3, name: 'Completed', slug: 'completed' },
                { id: 4, name: 'On-hold', slug: 'onhold' },
                { id: 5, name: 'Dropped', slug: 'dropped' },
                { id: 6, name: 'Owned', slug: 'owned' }
            ])
        }
        setOpenModal(true);
    }

    const handleCloseModal = () => {
        setOpenModal(false);
    }

    const handleCloseAlert = () => {
        setOpenAlert(false);
    }

    const handleError = (errorMessage: string) => {
        setOpenAlert(true);
        setAlertMessage(errorMessage);
        setAlertSeverity("error");
    }

    useEffect(() => {
        const addGameToCollection = async () => {
            if (!game) return;
            try {
                const userId = user?.uid;
                await AddGameToUserCollection(userId, game);

                setSelectedPlatform('');
                setSelectedStatus('');
                setAlertSeverity("success");
                setAlertMessage('Game successfully added to user collection')
                setOpenAlert(true);
                setGame(undefined);
                setSelectedGame(undefined);


                setOpenModal(false);



            } catch (error) {
                handleError(error instanceof Error ? error.message : "An error occurred");
                console.error('Error adding game to user collection:', error);
            }
        };

        addGameToCollection();
    }, [game, user]);

    const onAddClick = async (selectedGame?: SearchGameResult): Promise<void> => {
        try {
            if (!selectedGame) {
                console.error('Game not selected');
                return;
            }

            setGame({
                id: selectedGame.id,
                background_image: selectedGame.background_image,
                status: selectedStatus,
                notes: '',
                platform: selectedPlatform,
                slug: selectedGame.slug,
                name: selectedGame.name
            });

            console.log(selectedGame);
            console.log(game);
            setSelectedPlatform('');
            setSelectedStatus('');

        } catch (e) {
            setOpenAlert(true);
        }

    };

    return (
        <div className='SearchPage'>
            <IconButton onClick={handleGoBack} style={{ position: 'absolute', top: 20, left: 20 }}>
                <ArrowBackIcon />
            </IconButton>
            <h1>Search and Add Game</h1>
            <div>
                <div className='SearchWrapper'>
                    <Input
                        type="text"
                        placeholder="Search for a game..."
                        value={searchTerm}
                        onChange={handleInputChange}
                        fullWidth
                    />
                    <IconButton onClick={() => handleSearch(currentPage)}><SearchIcon /></IconButton>
                </div>

                <div className='CardsWrapper'>
                    {searchResults.map((res: SearchGameResult) => {
                        return (
                            <CardGameResult
                                cardTitle={res.name}
                                key={res.id}
                                onAddClick={() => handleOpenModal(res)}
                            />
                        )
                    })}
                </div>
                {searchResults.length > 0 &&
                    <Pagination
                        count={Math.ceil(totalResults / 20)}
                        page={currentPage}
                        onChange={handlePaginationChange}
                        variant="outlined"
                        shape="rounded"
                    />
                }


            </div>
            <AlertModal
                message={alertMessage}
                severity={alertSeverity}
                onClose={handleCloseAlert}
                open={openAlert}
            />
            {openModal && (
                <AddGameModal
                    open={openModal}
                    handleClose={handleCloseModal}
                    game={selectedGame}
                    addGame={() => onAddClick(selectedGame)}
                    platforms={platforms}
                    statuses={statuses}
                    status={selectedStatus}
                    platform={selectedPlatform}
                    handlePlatformChange={handlePlatformChange}
                    handleStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
};

export default SearchPage;
