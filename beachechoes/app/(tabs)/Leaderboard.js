import Button from '../../components/Button'
import Header from '../../components/Header'
import Background from '../../components/Background'
import { useRouter } from 'expo-router'

// Jose's File
export default function Leaderboard() {
    const router = useRouter()
    return(
        <>        
        <Background>
            <Header>
                Leaderboard
            </Header>
        </Background>
        </>
    )
}